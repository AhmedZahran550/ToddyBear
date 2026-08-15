import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DatabaseService } from '../../database/database.service';
import { Ringtone } from '../../database/entities/ringtone.entity';
import { CloudStorageService } from '../cloud-storage/cloud-storage.service';
import { PaginationQueryDto, PaginatedResultDto } from '../../common/dto/pagination.dto';

const ALLOWED_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/x-m4a',
  'audio/m4a',
  'audio/aac',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_USER_RINGTONES = 5;

@Injectable()
export class RingtonesService extends DatabaseService<Ringtone> {
  constructor(
    @InjectRepository(Ringtone)
    private readonly ringtoneRepo: Repository<Ringtone>,
    private readonly cloudStorageService: CloudStorageService,
  ) {
    super(ringtoneRepo);
  }

  async uploadUserRingtone(
    userId: string,
    file: Express.Multer.File,
    name: string,
  ): Promise<Ringtone> {
    if (!file) {
      throw new BadRequestException('Audio file is required');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid audio format: ${file.mimetype}. Allowed formats: MP3, WAV, OGG, M4A, AAC`,
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds maximum allowed limit of 5 MB (current: ${(file.size / (1024 * 1024)).toFixed(2)} MB)`,
      );
    }

    // Check user's current ringtone count
    const count = await this.ringtoneRepo.count({
      where: { userId, isDefault: false },
    });

    if (count >= MAX_USER_RINGTONES) {
      throw new BadRequestException(
        `Ringtone limit reached. Each user can upload at most ${MAX_USER_RINGTONES} ringtones. Please delete an existing ringtone first.`,
      );
    }

    // Upload to Cloudinary
    const folder = `toddybear/ringtones/${userId}`;
    const result = await this.cloudStorageService.uploadAudio(
      file.buffer,
      folder,
    );

    // Save entity
    return this.create({
      name: name.trim(),
      cloudinaryPublicId: result.publicId,
      url: result.secureUrl,
      fileSize: file.size,
      mimeType: file.mimetype,
      isDefault: false,
      userId,
    });
  }

  async findByUser(
    userId: string,
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResultDto<Ringtone>> {
    return this.findAll(pagination, {
      where: { userId, isDefault: false },
      order: { createdAt: 'DESC' },
    });
  }

  async findDefaults(
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResultDto<Ringtone>> {
    return this.findAll(pagination, {
      where: { isDefault: true },
      order: { createdAt: 'ASC' },
    });
  }

  async findAllAvailable(
    userId: string,
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResultDto<Ringtone>> {
    return this.findAll(pagination, {
      where: [{ isDefault: true }, { userId, isDefault: false }],
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  async deleteUserRingtone(id: string, userId: string): Promise<void> {
    const ringtone = await this.ringtoneRepo.findOne({ where: { id } });

    if (!ringtone) {
      throw new NotFoundException(`Ringtone with ID "${id}" not found`);
    }

    if (ringtone.isDefault) {
      throw new ForbiddenException('System default ringtones cannot be deleted');
    }

    if (ringtone.userId !== userId) {
      throw new ForbiddenException('You do not have permission to delete this ringtone');
    }

    // Remove from Cloudinary
    await this.cloudStorageService.deleteFile(ringtone.cloudinaryPublicId);

    // Remove from database
    await this.ringtoneRepo.remove(ringtone);
  }

  async getDownloadBuffer(
    id: string,
  ): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    const ringtone = await this.ringtoneRepo.findOne({ where: { id } });

    if (!ringtone) {
      throw new NotFoundException(`Ringtone with ID "${id}" not found`);
    }

    const { buffer, contentType } = await this.cloudStorageService.getFileBuffer(
      ringtone.url,
    );

    const ext = ringtone.mimeType.split('/')[1] || 'mp3';
    const filename = `${ringtone.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.${ext}`;

    return {
      buffer,
      contentType: contentType || ringtone.mimeType,
      filename,
    };
  }
}

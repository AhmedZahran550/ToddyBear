import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { DatabaseService } from '../../database/database.service';
import { Alarm } from '../../database/entities/alarm.entity';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { CloudStorageService } from '../cloud-storage/cloud-storage.service';

@Injectable()
export class AlarmsService extends DatabaseService<Alarm> {
  constructor(
    @InjectRepository(Alarm)
    private readonly alarmRepo: Repository<Alarm>,
    private readonly cloudStorageService: CloudStorageService,
  ) {
    super(alarmRepo);
  }

  async findByUser(userId: string, pagination: PaginationQueryDto) {
    return this.findAll(pagination, {
      where: { userId },
      relations: { ringtone: true, device: true },
      order: { time: 'ASC' },
    });
  }

  async findDueAlarms(currentHM: string): Promise<Alarm[]> {
    return this.alarmRepo.find({
      where: { time: currentHM, enabled: true },
      relations: {
        user: { devices: true },
        ringtone: true,
        device: true,
      },
    });
  }

  async disableByTime(userId: string, time: string): Promise<number> {
    const result = await this.alarmRepo.update(
      { userId, time, enabled: true },
      { enabled: false },
    );
    return result.affected || 0;
  }

  async deleteAllByUser(userId: string): Promise<number> {
    const result = await this.alarmRepo.delete({ userId });
    return result.affected || 0;
  }

  async getAlarmRingtone(
    id: string,
  ): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    const alarm = await this.alarmRepo.findOne({
      where: { id },
      relations: { ringtone: true },
    });

    if (!alarm) {
      throw new NotFoundException(`Alarm with ID "${id}" not found`);
    }

    if (alarm.ringtone && alarm.ringtone.url) {
      const { buffer, contentType } =
        await this.cloudStorageService.getFileBuffer(alarm.ringtone.url);
      const ext = alarm.ringtone.mimeType?.split('/')[1] || 'mp3';
      const filename = `${(alarm.ringtone.name || 'ringtone').replace(/[^a-zA-Z0-9_-]/g, '_')}.${ext}`;
      return {
        buffer,
        contentType: contentType || alarm.ringtone.mimeType || 'audio/mpeg',
        filename,
      };
    }

    let localPath = path.resolve(process.cwd(), 'ringtones', 'music.wav');
    if (!fs.existsSync(localPath)) {
      localPath = path.resolve(__dirname, '../../../../ringtones/music.wav');
    }

    if (!fs.existsSync(localPath)) {
      throw new NotFoundException('Default ringtone file not found on server');
    }

    const buffer = await fs.promises.readFile(localPath);
    return {
      buffer,
      contentType: 'audio/wav',
      filename: 'music.wav',
    };
  }
}

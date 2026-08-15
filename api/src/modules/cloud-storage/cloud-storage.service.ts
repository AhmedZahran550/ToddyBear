import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import axios from 'axios';
import { Readable } from 'stream';

export interface UploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
  format: string;
  bytes: number;
}

@Injectable()
export class CloudStorageService {
  private readonly logger = new Logger(CloudStorageService.name);

  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadAudio(
    fileBuffer: Buffer,
    folder: string,
    filename?: string,
  ): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const uploadOptions: Record<string, any> = {
        resource_type: 'video', // Cloudinary handles audio files under the 'video' resource_type
        folder,
      };

      if (filename) {
        uploadOptions.public_id = filename;
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result: UploadApiResponse | undefined) => {
          if (error || !result) {
            this.logger.error(
              `Cloudinary upload failed: ${error?.message || 'Unknown error'}`,
            );
            return reject(
              new BadRequestException(
                `Failed to upload audio to cloud storage: ${error?.message || 'Unknown error'}`,
              ),
            );
          }

          resolve({
            publicId: result.public_id,
            url: result.url,
            secureUrl: result.secure_url,
            format: result.format,
            bytes: result.bytes,
          });
        },
      );

      const readableStream = new Readable();
      readableStream.push(fileBuffer);
      readableStream.push(null);
      readableStream.pipe(uploadStream);
    });
  }

  async deleteFile(
    publicId: string,
    resourceType: 'image' | 'video' | 'raw' = 'video',
  ): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });
      this.logger.log(`Deleted file with public ID: ${publicId}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete file from Cloudinary (${publicId}): ${error?.message || error}`,
      );
    }
  }

  async getFileBuffer(urlOrPublicId: string): Promise<{ buffer: Buffer; contentType: string }> {
    try {
      // If full url is passed, download from url. Otherwise build url from publicId
      const targetUrl = urlOrPublicId.startsWith('http')
        ? urlOrPublicId
        : cloudinary.url(urlOrPublicId, { resource_type: 'video' });

      const response = await axios.get(targetUrl, {
        responseType: 'arraybuffer',
      });

      const contentType = String(
        response.headers['content-type'] || 'audio/mpeg',
      );

      return {
        buffer: Buffer.from(response.data),
        contentType,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch audio stream: ${error?.message || error}`,
      );
      throw new BadRequestException('Failed to download audio file');
    }
  }
}

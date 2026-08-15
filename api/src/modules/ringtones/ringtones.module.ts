import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ringtone } from '../../database/entities/ringtone.entity';
import { RingtonesController } from './ringtones.controller';
import { RingtonesService } from './ringtones.service';
import { CloudStorageModule } from '../cloud-storage/cloud-storage.module';

@Module({
  imports: [TypeOrmModule.forFeature([Ringtone]), CloudStorageModule],
  controllers: [RingtonesController],
  providers: [RingtonesService],
  exports: [RingtonesService],
})
export class RingtonesModule {}

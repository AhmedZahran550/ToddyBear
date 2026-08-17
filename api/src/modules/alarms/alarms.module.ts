import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Alarm } from '../../database/entities/alarm.entity';
import { AlarmsService } from './alarms.service';
import { AlarmsController } from './alarms.controller';
import { AlarmsScheduler } from './alarms.scheduler';
import { SseModule } from '../sse/sse.module';
import { CloudStorageModule } from '../cloud-storage/cloud-storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Alarm]),
    SseModule,
    CloudStorageModule,
  ],
  controllers: [AlarmsController],
  providers: [AlarmsService, AlarmsScheduler],
  exports: [AlarmsService],
})
export class AlarmsModule {}

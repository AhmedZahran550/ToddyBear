import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AlarmsService } from './alarms.service';
import { SseService } from '../sse/sse.service';

@Injectable()
export class AlarmsScheduler {
  private readonly logger = new Logger(AlarmsScheduler.name);

  constructor(
    private readonly alarmsService: AlarmsService,
    private readonly sseService: SseService,
  ) {}

  // @Cron('*/20 * * * * *')
  // async handleAlarmCheck() {
  //   try {
  //     const now = new Date();
  //     const hh = String(now.getHours()).padStart(2, '0');
  //     const mm = String(now.getMinutes()).padStart(2, '0');
  //     const currentHM = `${hh}:${mm}`;
  //     const today = now.toISOString().split('T')[0];

  //     const dueAlarms = await this.alarmsService.findDueAlarms(currentHM);

  //     for (const alarm of dueAlarms) {
  //       if (alarm.lastTriggeredDate === today) {
  //         continue;
  //       }

  //       alarm.lastTriggeredDate = today;
  //       await this.alarmsService.update(alarm.id, { lastTriggeredDate: today });

  //       if (alarm.device && alarm.device.macAddress) {
  //         this.logger.log(`⏰ Triggering alarm ${alarm.id} (${alarm.time}) for device ${alarm.device.macAddress}`);
  //         this.sseService.notifyAlarm(alarm.device.macAddress, alarm.id);
  //       }
  //     }
  //   } catch (error) {
  //     this.logger.error(`Error in alarm checker loop: ${error?.message || error}`);
  //   }
  // }
}

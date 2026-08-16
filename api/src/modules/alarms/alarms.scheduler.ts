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

  @Cron('0 * * * * *')
  async handleAlarmCheck() {
    try {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const currentHM = `${hh}:${mm}`;
      const today = now.toISOString().split('T')[0];
      const dueAlarms = await this.alarmsService.findDueAlarms(currentHM);

      for (const alarm of dueAlarms) {
        if (alarm.lastTriggeredDate === today) {
          continue;
        }

        alarm.lastTriggeredDate = today;
        await this.alarmsService.update(alarm.id, {
          lastTriggeredDate: today,
          enabled: false,
        });

        const ringtoneDownloadUrl = alarm.ringtoneId
          ? `/api/ringtones/${alarm.ringtoneId}/download`
          : null;

        const payload = {
          alarmId: alarm.id,
          ringtoneDownloadUrl,
          label: alarm.label || null,
        };

        // If alarm has a specific targeted device
        if (alarm.device && alarm.device.id) {
          this.logger.log(
            `⏰ Triggering alarm ${alarm.id} (${alarm.time}) for device ${alarm.device.id} (ringtone: ${alarm.ringtone?.name || 'none'})`,
          );
          this.sseService.notifyAlarm(alarm.device.id, payload);
        } else if (
          alarm.user &&
          alarm.user.devices &&
          alarm.user.devices.length > 0
        ) {
          // Otherwise trigger for all devices registered to the user
          for (const dev of alarm.user.devices) {
            if (dev.id) {
              this.logger.log(
                `⏰ Triggering alarm ${alarm.id} (${alarm.time}) for user's device ${dev.id}`,
              );
              this.sseService.notifyAlarm(dev.id, payload);
            }
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Error in alarm checker loop: ${error?.message || error}`,
      );
    }
  }
}

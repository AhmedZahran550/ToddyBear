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

  @Cron('*/20 * * * * *')
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
        await this.alarmsService.update(alarm.id, { lastTriggeredDate: today });

        const ringtoneDownloadUrl = alarm.ringtoneId
          ? `/api/ringtones/${alarm.ringtoneId}/download`
          : null;

        const payload = {
          alarmId: alarm.id,
          ringtoneDownloadUrl,
          label: alarm.label || null,
        };

        // If alarm has a specific targeted device
        if (alarm.device && alarm.device.macAddress) {
          this.logger.log(
            `⏰ Triggering alarm ${alarm.id} (${alarm.time}) for device ${alarm.device.macAddress} (ringtone: ${alarm.ringtone?.name || 'none'})`,
          );
          this.sseService.notifyAlarm(alarm.device.macAddress, payload);
        } else if (alarm.user && alarm.user.devices && alarm.user.devices.length > 0) {
          // Otherwise trigger for all devices registered to the user
          for (const dev of alarm.user.devices) {
            if (dev.macAddress) {
              this.logger.log(
                `⏰ Triggering alarm ${alarm.id} (${alarm.time}) for user's device ${dev.macAddress}`,
              );
              this.sseService.notifyAlarm(dev.macAddress, payload);
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

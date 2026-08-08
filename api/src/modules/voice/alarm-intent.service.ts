import { Injectable, Logger } from '@nestjs/common';
import { AlarmsService } from '../alarms/alarms.service';

@Injectable()
export class AlarmIntentService {
  private readonly logger = new Logger(AlarmIntentService.name);
  private pendingAlarms = new Map<string, any>();

  constructor(private readonly alarmsService: AlarmsService) {}

  private normalizeText(text: string): string {
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    let result = text || '';
    for (let i = 0; i < 10; i++) {
      result = result.replace(new RegExp(arabicDigits[i], 'g'), String(i));
    }
    return result;
  }

  containsAlarmIntent(text: string): boolean {
    const t = this.normalizeText(text);
    const keywords = ['منبه', 'المنبه', 'نبهني', 'فكرني', 'ذكرني', 'اعمل منبه', 'ظبط منبه'];
    return keywords.some((k) => t.includes(k));
  }

  extractTimeFromText(text: string): { hour: number; minute: number } | null {
    const t = this.normalizeText(text);

    // Check HH:MM format
    const match = t.match(/(\d{1,2})[:.](\d{2})/);
    if (match) {
      return { hour: parseInt(match[1], 10), minute: parseInt(match[2], 10) };
    }

    // Check simple hour digit
    const digitMatch = t.match(/(?<!\d)(\d{1,2})(?!\d)/);
    if (digitMatch) {
      let hour = parseInt(digitMatch[1], 10);
      let minute = 0;

      if (t.includes('نص') || t.includes('نصف')) minute = 30;
      else if (t.includes('ربع')) minute = 15;
      else if (t.includes('تلت') || t.includes('ثلث')) minute = 20;

      if ((t.includes('مساء') || t.includes('بالليل')) && hour <= 12) {
        hour = hour === 12 ? 12 : hour + 12;
      }

      return { hour, minute };
    }

    return null;
  }

  async handleAlarmFlow(deviceId: string, userText: string): Promise<string | null> {
    if (!this.containsAlarmIntent(userText)) {
      return null;
    }

    const time = this.extractTimeFromText(userText);
    if (time) {
      const timeStr = `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
      await this.alarmsService.create({
        deviceId,
        time: timeStr,
        enabled: true,
      });
      return `تم ضبط المنبه على الساعة ${timeStr} بنجاح!`;
    }

    return 'الساعة كام تحب تظبط المنبه؟';
  }
}

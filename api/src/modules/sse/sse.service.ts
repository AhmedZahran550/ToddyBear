import { Injectable, MessageEvent } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

export interface AlarmNotificationPayload {
  alarmId: string;
  ringtoneDownloadUrl?: string | null;
  label?: string | null;
}

@Injectable()
export class SseService {
  private streams = new Map<string, Subject<MessageEvent>>();

  getStream(macAddress: string): Observable<MessageEvent> {
    const key = macAddress.toUpperCase();
    if (!this.streams.has(key)) {
      this.streams.set(key, new Subject<MessageEvent>());
    }
    return this.streams.get(key)!.asObservable();
  }

  pushEvent(macAddress: string, data: any): void {
    const key = macAddress.toUpperCase();
    const subject = this.streams.get(key);
    if (subject) {
      subject.next({ data: JSON.stringify(data) } as MessageEvent);
    }
  }

  notifyPendingAudio(macAddress: string): void {
    this.pushEvent(macAddress, { type: 'pending_audio' });
  }

  notifyAlarm(
    macAddress: string,
    alarmIdOrPayload: string | AlarmNotificationPayload,
  ): void {
    if (typeof alarmIdOrPayload === 'string') {
      this.pushEvent(macAddress, { type: 'alarm', alarmId: alarmIdOrPayload });
    } else {
      this.pushEvent(macAddress, {
        type: 'alarm',
        ...alarmIdOrPayload,
      });
    }
  }
}

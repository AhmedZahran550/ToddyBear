import { Injectable, MessageEvent } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

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

  notifyAlarm(macAddress: string, alarmId: string): void {
    this.pushEvent(macAddress, { type: 'alarm', alarmId });
  }
}

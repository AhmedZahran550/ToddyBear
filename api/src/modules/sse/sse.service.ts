import { Injectable, Logger, MessageEvent, Inject, forwardRef } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { DevicesService } from '../devices/devices.service';

export interface AlarmNotificationPayload {
  alarmId: string;
  ringtoneDownloadUrl?: string | null;
  label?: string | null;
}

@Injectable()
export class SseService {
  private readonly logger = new Logger(SseService.name);
  private streams = new Map<string, Subject<MessageEvent>>();

  constructor(
    @Inject(forwardRef(() => DevicesService))
    private readonly devicesService: DevicesService,
  ) {}

  getStream(macAddress: string): Observable<MessageEvent> {
    const key = macAddress.toUpperCase().trim();

    // If an existing stream exists for this device, complete it first
    if (this.streams.has(key)) {
      const oldSubject = this.streams.get(key);
      try {
        oldSubject?.complete();
      } catch {}
      this.streams.delete(key);
    }

    const subject = new Subject<MessageEvent>();
    this.streams.set(key, subject);

    // Update device status to online
    this.devicesService.setOnlineStatus(key, true);
    this.logger.log(
      `🔌 Device connected: ${key} (Active SSE connections: ${this.streams.size})`,
    );

    return subject.asObservable().pipe(
      finalize(() => {
        this.removeStream(key);
      }),
    );
  }

  removeStream(macAddress: string): void {
    const key = macAddress.toUpperCase().trim();
    const subject = this.streams.get(key);

    if (subject) {
      try {
        subject.complete();
      } catch {}
      this.streams.delete(key);

      // Update device status to offline
      this.devicesService.setOnlineStatus(key, false);
      this.logger.log(
        `❌ Device disconnected: ${key} (Active SSE connections: ${this.streams.size})`,
      );
    }
  }

  pushEvent(macAddress: string, data: any): void {
    const key = macAddress.toUpperCase().trim();
    const subject = this.streams.get(key);
    if (subject && !subject.closed) {
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

  getActiveConnectionCount(): number {
    return this.streams.size;
  }
}

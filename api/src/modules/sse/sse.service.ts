import {
  Injectable,
  Logger,
  MessageEvent,
  Inject,
  forwardRef,
} from '@nestjs/common';
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

  getStream(id: string): Observable<MessageEvent> {
    // If an existing stream exists for this device, complete it first
    if (this.streams.has(id)) {
      const oldSubject = this.streams.get(id);
      try {
        oldSubject?.complete();
      } catch {}
      this.streams.delete(id);
    }

    const subject = new Subject<MessageEvent>();
    this.streams.set(id, subject);

    // Update device status to online
    this.devicesService.setOnlineStatus(id, true);
    this.logger.log(
      `🔌 Device connected: ${id} (Active SSE connections: ${this.streams.size})`,
    );

    return subject.asObservable().pipe(
      finalize(() => {
        this.removeStream(id);
      }),
    );
  }

  removeStream(id: string): void {
    const subject = this.streams.get(id);

    if (subject) {
      try {
        subject.complete();
      } catch {}
      this.streams.delete(id);

      // Update device status to offline
      this.devicesService.setOnlineStatus(id, false);
      this.logger.log(
        `❌ Device disconnected: ${id} (Active SSE connections: ${this.streams.size})`,
      );
    }
  }

  pushEvent(id: string, data: any): void {
    const subject = this.streams.get(id);
    if (subject && !subject.closed) {
      subject.next({ data: JSON.stringify(data) } as MessageEvent);
    }
  }

  notifyPendingAudio(id: string): void {
    this.pushEvent(id, { type: 'pending_audio' });
  }

  notifyAlarm(
    id: string,
    alarmIdOrPayload: string | AlarmNotificationPayload,
  ): void {
    if (typeof alarmIdOrPayload === 'string') {
      this.pushEvent(id, { type: 'alarm', alarmId: alarmIdOrPayload });
    } else {
      this.pushEvent(id, {
        type: 'alarm',
        ...alarmIdOrPayload,
      });
    }
  }

  getActiveConnectionCount(): number {
    return this.streams.size;
  }
}

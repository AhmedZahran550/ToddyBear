import {
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import WebSocket from 'ws';
import { randomUUID } from 'crypto';
import { ChatsService } from '../chats/chats.service';
import { ChatRole } from '../../database/entities/chat.entity';

export interface TranscriptEntry {
  role: ChatRole;
  content: string;
  timestamp: Date;
}

export interface ActiveSession {
  sessionId: string;
  toyWs: WebSocket;
  geminiWs: WebSocket;
  deviceId: string;
  userId: string;
  deviceName: string;
  childProfile: any;
  transcript: TranscriptEntry[];
  lastActivity: number;
  isClosing: boolean;
}

@Injectable()
export class GeminiLiveSessionManager implements OnModuleDestroy {
  private readonly logger = new Logger(GeminiLiveSessionManager.name);
  private sessions = new Map<WebSocket, ActiveSession>();
  private readonly sessionTimeoutMs: number;

  constructor(
    private readonly chatsService: ChatsService,
    private readonly configService: ConfigService,
  ) {
    this.sessionTimeoutMs = this.configService.get<number>(
      'GEMINI_LIVE_SESSION_TIMEOUT_MS',
      15 * 60 * 1000, // 15 minutes default
    );
  }

  registerSession(params: {
    toyWs: WebSocket;
    geminiWs: WebSocket;
    deviceId: string;
    userId: string;
    deviceName: string;
    childProfile: any;
  }): ActiveSession {
    const session: ActiveSession = {
      sessionId: randomUUID(),
      toyWs: params.toyWs,
      geminiWs: params.geminiWs,
      deviceId: params.deviceId,
      userId: params.userId,
      deviceName: params.deviceName,
      childProfile: params.childProfile,
      transcript: [],
      lastActivity: Date.now(),
      isClosing: false,
    };

    this.sessions.set(params.toyWs, session);
    this.logger.log(
      `✨ Session [${session.sessionId}] registered for device ${params.deviceId} (User: ${params.userId}). Active count: ${this.sessions.size}`,
    );

    return session;
  }

  getSession(toyWs: WebSocket): ActiveSession | undefined {
    return this.sessions.get(toyWs);
  }

  updateActivity(toyWs: WebSocket) {
    const session = this.sessions.get(toyWs);
    if (session) {
      session.lastActivity = Date.now();
    }
  }

  appendTranscript(toyWs: WebSocket, role: ChatRole, content: string) {
    const session = this.sessions.get(toyWs);
    if (!session || !content || !content.trim()) return;

    // Limit buffer to avoid unbounded memory growth in long sessions
    if (session.transcript.length >= 50) {
      session.transcript.shift();
    }

    session.transcript.push({
      role,
      content: content.trim(),
      timestamp: new Date(),
    });
  }

  async endSession(toyWs: WebSocket): Promise<void> {
    const session = this.sessions.get(toyWs);
    if (!session) return;

    if (session.isClosing) return;
    session.isClosing = true;

    this.logger.log(
      `🔌 Closing Session [${session.sessionId}] for device ${session.deviceId}`,
    );

    // 1. Close Gemini WS if still open
    try {
      if (
        session.geminiWs &&
        (session.geminiWs.readyState === WebSocket.OPEN ||
          session.geminiWs.readyState === WebSocket.CONNECTING)
      ) {
        session.geminiWs.close();
      }
    } catch (err) {
      this.logger.error(
        `Error closing Gemini socket in session [${session.sessionId}]: ${err.message}`,
      );
    }

    // 2. Persist transcript history in batch
    await this.persistTranscript(session);

    // 3. Remove session from map
    this.sessions.delete(toyWs);
    this.logger.log(
      `🏁 Session [${session.sessionId}] ended. Remaining active: ${this.sessions.size}`,
    );
  }

  private async persistTranscript(session: ActiveSession): Promise<void> {
    if (!session.transcript || session.transcript.length === 0) {
      return;
    }

    const count = session.transcript.length;
    this.logger.log(
      `💾 Persisting ${count} transcript items for session [${session.sessionId}]...`,
    );

    try {
      for (const entry of session.transcript) {
        await this.chatsService.create({
          userId: session.userId || undefined,
          deviceId: session.deviceId,
          role: entry.role,
          content: entry.content,
        });
      }
      this.logger.log(
        `✅ Transcript successfully persisted for session [${session.sessionId}] (${count} entries saved).`,
      );
    } catch (err) {
      this.logger.error(
        `❌ Failed to persist transcript for session [${session.sessionId}]: ${err.message}`,
      );
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async cleanupIdleSessions() {
    const now = Date.now();
    for (const [toyWs, session] of this.sessions.entries()) {
      if (now - session.lastActivity > this.sessionTimeoutMs) {
        this.logger.warn(
          `⏱️ Session [${session.sessionId}] timed out due to inactivity (${this.sessionTimeoutMs}ms). Closing...`,
        );

        if (toyWs.readyState === WebSocket.OPEN) {
          try {
            toyWs.send(
              JSON.stringify({
                cmd: 'SESSION_TIMEOUT',
                message: 'Session closed due to inactivity',
              }),
            );
            toyWs.close(1000, 'Session timeout');
          } catch {
            // Socket already dying
          }
        }

        await this.endSession(toyWs);
      }
    }
  }

  async onModuleDestroy() {
    this.logger.log('🛑 Module destroying: Terminating all active Gemini Live sessions...');
    const closePromises: Promise<void>[] = [];
    for (const toyWs of this.sessions.keys()) {
      closePromises.push(this.endSession(toyWs));
    }
    await Promise.allSettled(closePromises);
  }
}

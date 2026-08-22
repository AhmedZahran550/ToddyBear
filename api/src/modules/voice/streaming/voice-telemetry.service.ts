import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

export interface VoiceSessionMetrics {
  sessionId: string;
  deviceId?: string;
  userId?: string;
  startTime: number;
  sttStartMs?: number;
  sttFirstPartialMs?: number;
  sttFinalMs?: number;
  sttDurationMs?: number;
  llmStartMs?: number;
  llmFirstTokenMs?: number;
  llmFirstTokenLatencyMs?: number;
  llmEndMs?: number;
  llmDurationMs?: number;
  ttsFirstChunkStartMs?: number;
  ttsFirstByteSentMs?: number;
  ttsFirstByteLatencyMs?: number;
  ttsEndMs?: number;
  ttsDurationMs?: number;
  totalLatencyMs?: number;
  timeToFirstAudioMs?: number; // STT Final -> First Audio Sent to Device
  transcript?: string;
}

@Injectable()
export class VoiceTelemetryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(VoiceTelemetryService.name);
  private sessions = new Map<string, VoiceSessionMetrics>();
  private reaperInterval: NodeJS.Timeout | null = null;

  private readonly MAX_SESSION_AGE_MS = 120_000; // 2 minutes max session lifetime
  private readonly MAX_SESSIONS = 500; // Hard limit to prevent memory exhaustion

  onModuleInit() {
    this.reaperInterval = setInterval(() => this.reapStaleSessions(), 60_000);
  }

  onModuleDestroy() {
    if (this.reaperInterval) {
      clearInterval(this.reaperInterval);
      this.reaperInterval = null;
    }
    this.sessions.clear();
  }

  getActiveCount(): number {
    return this.sessions.size;
  }

  private reapStaleSessions(): void {
    const now = Date.now();
    let reaped = 0;

    for (const [id, metrics] of this.sessions.entries()) {
      if (now - metrics.startTime > this.MAX_SESSION_AGE_MS) {
        this.sessions.delete(id);
        reaped++;
      }
    }

    if (reaped > 0) {
      this.logger.warn(`🧹 Telemetry Reaper: Evicted ${reaped} orphaned/stale session(s). Active: ${this.sessions.size}`);
    }
  }

  startSession(sessionId: string, deviceId?: string, userId?: string): VoiceSessionMetrics {
    // If capacity reached, evict oldest session
    if (this.sessions.size >= this.MAX_SESSIONS) {
      const oldestKey = this.sessions.keys().next().value;
      if (oldestKey) {
        this.sessions.delete(oldestKey);
        this.logger.warn(`⚠️ Max telemetry session capacity reached (${this.MAX_SESSIONS}). Evicted oldest session.`);
      }
    }

    const now = Date.now();
    const metrics: VoiceSessionMetrics = {
      sessionId,
      deviceId,
      userId,
      startTime: now,
      sttStartMs: now,
    };
    this.sessions.set(sessionId, metrics);
    return metrics;
  }

  markSttPartial(sessionId: string): void {
    const metrics = this.sessions.get(sessionId);
    if (metrics && !metrics.sttFirstPartialMs) {
      metrics.sttFirstPartialMs = Date.now();
    }
  }

  markSttFinal(sessionId: string, transcript: string): void {
    const metrics = this.sessions.get(sessionId);
    if (metrics) {
      const now = Date.now();
      metrics.sttFinalMs = now;
      metrics.sttDurationMs = metrics.sttStartMs ? now - metrics.sttStartMs : undefined;
      metrics.transcript = transcript;
    }
  }

  markLlmStart(sessionId: string): void {
    const metrics = this.sessions.get(sessionId);
    if (metrics) {
      metrics.llmStartMs = Date.now();
    }
  }

  markLlmFirstToken(sessionId: string): void {
    const metrics = this.sessions.get(sessionId);
    if (metrics && !metrics.llmFirstTokenMs) {
      const now = Date.now();
      metrics.llmFirstTokenMs = now;
      if (metrics.llmStartMs) {
        metrics.llmFirstTokenLatencyMs = now - metrics.llmStartMs;
      }
    }
  }

  markLlmEnd(sessionId: string): void {
    const metrics = this.sessions.get(sessionId);
    if (metrics) {
      const now = Date.now();
      metrics.llmEndMs = now;
      if (metrics.llmStartMs) {
        metrics.llmDurationMs = now - metrics.llmStartMs;
      }
    }
  }

  markTtsFirstChunkStart(sessionId: string): void {
    const metrics = this.sessions.get(sessionId);
    if (metrics && !metrics.ttsFirstChunkStartMs) {
      metrics.ttsFirstChunkStartMs = Date.now();
    }
  }

  markTtsFirstByteSent(sessionId: string): void {
    const metrics = this.sessions.get(sessionId);
    if (metrics && !metrics.ttsFirstByteSentMs) {
      const now = Date.now();
      metrics.ttsFirstByteSentMs = now;
      if (metrics.ttsFirstChunkStartMs) {
        metrics.ttsFirstByteLatencyMs = now - metrics.ttsFirstChunkStartMs;
      }
      if (metrics.sttFinalMs) {
        metrics.timeToFirstAudioMs = now - metrics.sttFinalMs;
      } else if (metrics.startTime) {
        metrics.timeToFirstAudioMs = now - metrics.startTime;
      }
    }
  }

  markTtsEnd(sessionId: string): void {
    const metrics = this.sessions.get(sessionId);
    if (metrics) {
      const now = Date.now();
      metrics.ttsEndMs = now;
      if (metrics.ttsFirstChunkStartMs) {
        metrics.ttsDurationMs = now - metrics.ttsFirstChunkStartMs;
      }
    }
  }

  endSession(sessionId: string): VoiceSessionMetrics | undefined {
    const metrics = this.sessions.get(sessionId);
    if (!metrics) return undefined;

    const now = Date.now();
    metrics.totalLatencyMs = now - metrics.startTime;

    const stt = metrics.sttDurationMs ? `${metrics.sttDurationMs}ms` : 'N/A';
    const llmFirst = metrics.llmFirstTokenLatencyMs ? `${metrics.llmFirstTokenLatencyMs}ms` : 'N/A';
    const llmTotal = metrics.llmDurationMs ? `${metrics.llmDurationMs}ms` : 'N/A';
    const ttsFirst = metrics.ttsFirstByteLatencyMs ? `${metrics.ttsFirstByteLatencyMs}ms` : 'N/A';
    const ttsTotal = metrics.ttsDurationMs ? `${metrics.ttsDurationMs}ms` : 'N/A';
    const timeToFirstAudio = metrics.timeToFirstAudioMs ? `${metrics.timeToFirstAudioMs}ms` : 'N/A';
    const total = `${metrics.totalLatencyMs}ms`;

    this.logger.log(
      `📊 [Telemetry] Session ${sessionId} (Device: ${metrics.deviceId || 'anon'}): ` +
        `STT=${stt} | ` +
        `LLM[first-tok=${llmFirst}, total=${llmTotal}] | ` +
        `TTS[first-byte=${ttsFirst}, total=${ttsTotal}] | ` +
        `⚡ Time-To-First-Audio=${timeToFirstAudio} | Total=${total}`,
    );

    this.sessions.delete(sessionId);
    return metrics;
  }
}

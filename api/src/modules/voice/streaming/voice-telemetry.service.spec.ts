import { VoiceTelemetryService } from './voice-telemetry.service';

describe('VoiceTelemetryService', () => {
  let service: VoiceTelemetryService;

  beforeEach(() => {
    service = new VoiceTelemetryService();
  });

  it('should track session lifecycle and calculate latencies', () => {
    const sessionId = 'test-session-1';
    const metrics = service.startSession(sessionId, 'dev-1', 'user-1');

    expect(metrics.sessionId).toBe(sessionId);
    expect(metrics.deviceId).toBe('dev-1');
    expect(metrics.userId).toBe('user-1');

    service.markSttPartial(sessionId);
    expect(metrics.sttFirstPartialMs).toBeDefined();

    service.markSttFinal(sessionId, 'مرحبا كيف حالك');
    expect(metrics.sttFinalMs).toBeDefined();
    expect(metrics.transcript).toBe('مرحبا كيف حالك');
    expect(metrics.sttDurationMs).toBeGreaterThanOrEqual(0);

    service.markLlmStart(sessionId);
    service.markLlmFirstToken(sessionId);
    expect(metrics.llmFirstTokenMs).toBeDefined();
    expect(metrics.llmFirstTokenLatencyMs).toBeGreaterThanOrEqual(0);

    service.markLlmEnd(sessionId);
    expect(metrics.llmEndMs).toBeDefined();
    expect(metrics.llmDurationMs).toBeGreaterThanOrEqual(0);

    service.markTtsFirstChunkStart(sessionId);
    service.markTtsFirstByteSent(sessionId);
    expect(metrics.ttsFirstByteSentMs).toBeDefined();
    expect(metrics.timeToFirstAudioMs).toBeGreaterThanOrEqual(0);

    service.markTtsEnd(sessionId);
    expect(metrics.ttsEndMs).toBeDefined();

    const finalized = service.endSession(sessionId);
    expect(finalized).toBeDefined();
    expect(finalized?.totalLatencyMs).toBeGreaterThanOrEqual(0);
    expect(service.getActiveCount()).toBe(0);
  });

  it('should reap stale sessions older than MAX_SESSION_AGE_MS', () => {
    service.onModuleInit();
    const staleSessionId = 'stale-session';
    const metrics = service.startSession(staleSessionId);

    // Simulate session created 3 minutes ago
    metrics.startTime = Date.now() - 180_000;

    // Trigger reaper
    (service as any).reapStaleSessions();

    expect(service.getActiveCount()).toBe(0);
    service.onModuleDestroy();
  });

  it('should evict oldest session when MAX_SESSIONS capacity is reached', () => {
    // Fill up to max capacity
    for (let i = 0; i < 500; i++) {
      service.startSession(`session-${i}`);
    }
    expect(service.getActiveCount()).toBe(500);

    // Adding 501th should evict the first
    service.startSession('session-500');
    expect(service.getActiveCount()).toBe(500);
    expect(service.endSession('session-0')).toBeUndefined();
    expect(service.endSession('session-500')).toBeDefined();
  });
});


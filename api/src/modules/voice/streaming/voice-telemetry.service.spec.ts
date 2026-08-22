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
  });
});

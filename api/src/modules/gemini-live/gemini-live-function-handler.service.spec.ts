import { Test, TestingModule } from '@nestjs/testing';
import { GeminiLiveFunctionHandlerService } from './gemini-live-function-handler.service';
import { AlarmsService } from '../alarms/alarms.service';
import { MessagePlaceholderService } from '../voice/message-placeholder.service';

describe('GeminiLiveFunctionHandlerService', () => {
  let service: GeminiLiveFunctionHandlerService;
  let alarmsService: jest.Mocked<AlarmsService>;
  let messageService: jest.Mocked<MessagePlaceholderService>;

  beforeEach(async () => {
    const mockAlarmsService = {
      create: jest.fn().mockResolvedValue({ id: 'alarm-123', time: '07:30', label: 'Wake up' }),
      disableByTime: jest.fn().mockResolvedValue(1),
      deleteAllByUser: jest.fn().mockResolvedValue(3),
    };

    const mockMessageService = {
      sendMessage: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeminiLiveFunctionHandlerService,
        { provide: AlarmsService, useValue: mockAlarmsService },
        { provide: MessagePlaceholderService, useValue: mockMessageService },
      ],
    }).compile();

    service = module.get<GeminiLiveFunctionHandlerService>(
      GeminiLiveFunctionHandlerService,
    );
    alarmsService = module.get(AlarmsService);
    messageService = module.get(MessagePlaceholderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('setAlarm', () => {
    it('should set an alarm with valid 24h format', async () => {
      const result = await service.executeFunction(
        'setAlarm',
        { time: '07:30', label: 'School time' },
        { userId: 'user-1', deviceId: 'dev-1' },
      );

      expect(result.success).toBe(true);
      expect(result.time).toBe('07:30');
      expect(alarmsService.create).toHaveBeenCalledWith({
        userId: 'user-1',
        deviceId: 'dev-1',
        time: '07:30',
        label: 'School time',
        enabled: true,
      });
    });

    it('should reject invalid time format', async () => {
      const result = await service.executeFunction(
        'setAlarm',
        { time: '7:30 PM' },
        { userId: 'user-1', deviceId: 'dev-1' },
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid time format');
      expect(alarmsService.create).not.toHaveBeenCalled();
    });
  });

  describe('disableAlarm', () => {
    it('should disable an alarm by time', async () => {
      const result = await service.executeFunction(
        'disableAlarm',
        { time: '08:00' },
        { userId: 'user-1', deviceId: 'dev-1' },
      );

      expect(result.success).toBe(true);
      expect(result.affectedCount).toBe(1);
      expect(alarmsService.disableByTime).toHaveBeenCalledWith('user-1', '08:00');
    });
  });

  describe('clearAllAlarms', () => {
    it('should delete all alarms for user', async () => {
      const result = await service.executeFunction(
        'clearAllAlarms',
        {},
        { userId: 'user-1', deviceId: 'dev-1' },
      );

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(3);
      expect(alarmsService.deleteAllByUser).toHaveBeenCalledWith('user-1');
    });
  });

  describe('sendMessage', () => {
    it('should dispatch message with recipient and content', async () => {
      const result = await service.executeFunction(
        'sendMessage',
        { recipient: 'dad', content: 'I finished my homework!' },
        { userId: 'user-1', deviceId: 'dev-1' },
      );

      expect(result.success).toBe(true);
      expect(messageService.sendMessage).toHaveBeenCalledWith({
        userId: 'user-1',
        recipient: 'dad',
        content: 'I finished my homework!',
      });
    });

    it('should fail when missing recipient or content', async () => {
      const result = await service.executeFunction(
        'sendMessage',
        { recipient: 'dad' },
        { userId: 'user-1', deviceId: 'dev-1' },
      );

      expect(result.success).toBe(false);
      expect(messageService.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('unknown function', () => {
    it('should return failure for unknown function name', async () => {
      const result = await service.executeFunction(
        'unknownAction',
        {},
        { userId: 'user-1', deviceId: 'dev-1' },
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown tool function');
    });
  });
});

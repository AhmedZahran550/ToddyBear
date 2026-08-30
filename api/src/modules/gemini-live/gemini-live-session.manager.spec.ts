import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GeminiLiveSessionManager } from './gemini-live-session.manager';
import { ChatsService } from '../chats/chats.service';
import { ChatRole } from '../../database/entities/chat.entity';
import WebSocket from 'ws';

describe('GeminiLiveSessionManager', () => {
  let manager: GeminiLiveSessionManager;
  let chatsService: jest.Mocked<ChatsService>;

  beforeEach(async () => {
    const mockChatsService = {
      create: jest.fn().mockResolvedValue({ id: 'chat-1' }),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue(900000),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeminiLiveSessionManager,
        { provide: ChatsService, useValue: mockChatsService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    manager = module.get<GeminiLiveSessionManager>(GeminiLiveSessionManager);
    chatsService = module.get(ChatsService);
  });

  it('should be defined', () => {
    expect(manager).toBeDefined();
  });

  it('should register and retrieve a session', () => {
    const mockToyWs = {} as WebSocket;
    const mockGeminiWs = {} as WebSocket;

    const session = manager.registerSession({
      toyWs: mockToyWs,
      geminiWs: mockGeminiWs,
      deviceId: 'dev-1',
      userId: 'user-1',
      deviceName: 'Toddy',
      childProfile: { preferredName: 'Lina' },
    });

    expect(session.sessionId).toBeDefined();
    expect(manager.getSession(mockToyWs)).toBe(session);
  });

  it('should append transcripts and batch persist on endSession', async () => {
    const mockToyWs = {} as WebSocket;
    const mockGeminiWs = {
      readyState: WebSocket.OPEN,
      close: jest.fn(),
    } as unknown as WebSocket;

    manager.registerSession({
      toyWs: mockToyWs,
      geminiWs: mockGeminiWs,
      deviceId: 'dev-1',
      userId: 'user-1',
      deviceName: 'Toddy',
      childProfile: {},
    });

    manager.appendTranscript(mockToyWs, ChatRole.USER, 'Tell me a story');
    manager.appendTranscript(mockToyWs, ChatRole.ASSISTANT, 'Once upon a time...');

    await manager.endSession(mockToyWs);

    expect(mockGeminiWs.close).toHaveBeenCalled();
    expect(chatsService.create).toHaveBeenCalledTimes(2);
    expect(chatsService.create).toHaveBeenCalledWith({
      userId: 'user-1',
      deviceId: 'dev-1',
      role: ChatRole.USER,
      content: 'Tell me a story',
    });
    expect(chatsService.create).toHaveBeenCalledWith({
      userId: 'user-1',
      deviceId: 'dev-1',
      role: ChatRole.ASSISTANT,
      content: 'Once upon a time...',
    });

    expect(manager.getSession(mockToyWs)).toBeUndefined();
  });
});

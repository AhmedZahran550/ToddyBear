import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, WebSocket as ClientSocket } from 'ws';
import { IncomingMessage } from 'http';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { GeminiLiveRelayService } from './gemini-live-relay.service';
import {
  GeminiLiveSessionManager,
  ActiveSession,
} from './gemini-live-session.manager';
import { GeminiLiveFunctionHandlerService } from './gemini-live-function-handler.service';
import { AiPromptBuilder } from '../voice/ai/ai-prompt.builder';
import { DevicesService } from '../devices/devices.service';
import { ChatRole } from '../../database/entities/chat.entity';

@WebSocketGateway({ path: '/stream/toy' })
export class GeminiLiveGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(GeminiLiveGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly devicesService: DevicesService,
    private readonly geminiRelay: GeminiLiveRelayService,
    private readonly sessionManager: GeminiLiveSessionManager,
    private readonly functionHandler: GeminiLiveFunctionHandlerService,
    private readonly promptBuilder: AiPromptBuilder,
  ) {}

  async handleConnection(toyWs: ClientSocket, request: IncomingMessage) {
    this.logger.log(`🧸 New incoming WebSocket connection attempt from: ${request.socket.remoteAddress}`);

    // 1. Extract & validate JWT token from query parameter: ?token=xxx
    const token = this.extractTokenFromRequest(request);
    if (!token) {
      this.logger.warn('❌ WebSocket connection rejected: Missing JWT token');
      toyWs.close(1008, 'Unauthorized: Missing token in query params (?token=...)');
      return;
    }

    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch (err) {
      this.logger.warn(`❌ WebSocket connection rejected: Invalid JWT token (${err.message})`);
      toyWs.close(1008, 'Unauthorized: Invalid or expired JWT token');
      return;
    }

    if (payload.type !== 'device') {
      this.logger.warn(
        `❌ WebSocket connection rejected: Token type '${payload.type}' is not a device`,
      );
      toyWs.close(1008, 'Unauthorized: Only authenticated devices may connect');
      return;
    }

    const deviceId = payload.sub || payload.id;
    const device = await this.devicesService.findByIdWithUser(deviceId);
    if (!device) {
      this.logger.warn(`❌ WebSocket connection rejected: Device not found (ID: ${deviceId})`);
      toyWs.close(1008, 'Unauthorized: Device not found in database');
      return;
    }

    const user = device.user;
    const userId = device.userId || user?.id;
    if (!userId) {
      this.logger.warn(`❌ WebSocket connection rejected: Device not assigned to user`);
      toyWs.close(1008, 'Unauthorized: Device not assigned to user');
      return;
    }

    // 2. Prepare Child / User Profile for Prompt Builder
    const userProfile = {
      id: user?.id,
      userId: user?.id,
      preferredName: user?.preferredName,
      firstName: user?.firstName,
      lastName: user?.lastName,
      userName:
        user?.preferredName ||
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() ||
        'Child',
      age: user?.age,
      gender: user?.gender,
      deviceName: device.name || 'Toddy',
    };

    const deviceName = device.name || 'Toddy';
    const systemPrompt = this.promptBuilder.buildLiveSystemPrompt(
      userProfile,
      deviceName,
    );

    // 3. Connect to Gemini Multimodal Live API
    const geminiApiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!geminiApiKey) {
      this.logger.error('❌ GEMINI_API_KEY is not configured in backend environment');
      toyWs.close(1011, 'Internal Server Error: Gemini API key missing');
      return;
    }

    let geminiWs: ClientSocket;
    try {
      geminiWs = this.geminiRelay.createGeminiLiveSession(
        geminiApiKey,
        systemPrompt,
      );
    } catch (err) {
      this.logger.error(`❌ Failed to establish Gemini Live WebSocket: ${err.message}`);
      toyWs.close(1011, 'Failed to connect to AI engine');
      return;
    }

    // 4. Register session in manager
    const session = this.sessionManager.registerSession({
      toyWs,
      geminiWs,
      deviceId: device.id,
      userId,
      deviceName,
      childProfile: userProfile,
    });

    // Mark device as online
    this.devicesService.setOnlineStatus(device.macAddress, true).catch(() => {});

    // 5. Setup event listeners for Gemini downstream messages
    this.bindGeminiEvents(session, geminiWs, toyWs);

    // 6. Setup event listeners for Toy upstream messages
    this.bindToyEvents(session, toyWs, geminiWs);
  }

  handleDisconnect(toyWs: ClientSocket) {
    const session = this.sessionManager.getSession(toyWs);
    if (session) {
      this.logger.log(`🧸 Smart Toy disconnected [Session: ${session.sessionId}]`);
      this.sessionManager.endSession(toyWs).catch((err) => {
        this.logger.error(`Error during session termination: ${err.message}`);
      });
    }
  }

  private bindGeminiEvents(
    session: ActiveSession,
    geminiWs: ClientSocket,
    toyWs: ClientSocket,
  ) {
    geminiWs.on('message', (rawData: Buffer | string) => {
      this.processGeminiDownstream(session, rawData.toString());
    });

    geminiWs.on('error', (err) => {
      this.logger.error(
        `❌ Gemini WS error [Session: ${session.sessionId}]: ${err.message}`,
      );
      if (toyWs.readyState === ClientSocket.OPEN) {
        toyWs.send(
          JSON.stringify({
            cmd: 'SESSION_ERROR',
            message: 'Gemini AI connection error',
          }),
        );
      }
    });

    geminiWs.on('close', (code, reason) => {
      this.logger.log(
        `🔒 Gemini Live WS closed for session [${session.sessionId}] (code: ${code}, reason: ${reason?.toString()})`,
      );
      if (toyWs.readyState === ClientSocket.OPEN && !session.isClosing) {
        toyWs.send(
          JSON.stringify({
            cmd: 'SESSION_ENDED',
            message: 'AI session closed',
          }),
        );
        toyWs.close(1000, 'Gemini session closed');
      }
    });
  }

  private bindToyEvents(
    session: ActiveSession,
    toyWs: ClientSocket,
    geminiWs: ClientSocket,
  ) {
    toyWs.on('message', (data: Buffer, isBinary: boolean) => {
      this.sessionManager.updateActivity(toyWs);

      if (isBinary) {
        // Binary stream is 16kHz PCM from Toy Microphone
        this.geminiRelay.relayMicChunkToGemini(geminiWs, data);
      } else {
        // Text stream is JSON control signals
        this.handleToySignal(session, data.toString());
      }
    });

    toyWs.on('error', (err) => {
      this.logger.error(
        `❌ Toy WS error [Session: ${session.sessionId}]: ${err.message}`,
      );
    });
  }

  private async processGeminiDownstream(
    session: ActiveSession,
    rawJson: string,
  ) {
    try {
      const response = JSON.parse(rawJson);

      // A. Setup Completed Confirmation
      if (response.setupComplete) {
        this.logger.log(`✅ Gemini setup confirmed for session [${session.sessionId}]`);
        if (session.toyWs.readyState === ClientSocket.OPEN) {
          session.toyWs.send(
            JSON.stringify({
              cmd: 'SESSION_READY',
              sessionId: session.sessionId,
            }),
          );
        }
        return;
      }

      // B. Audio stream chunks & Text turns from Gemini model
      if (response.serverContent?.modelTurn?.parts) {
        for (const part of response.serverContent.modelTurn.parts) {
          // Audio Part (24kHz PCM from Gemini)
          if (
            part.inlineData &&
            part.inlineData.mimeType?.startsWith('audio/pcm')
          ) {
            const rawPcm = Buffer.from(part.inlineData.data, 'base64');
            if (session.toyWs.readyState === ClientSocket.OPEN) {
              session.toyWs.send(rawPcm);
            }
          }

          // Text transcript part (if present)
          if (part.text && typeof part.text === 'string') {
            this.sessionManager.appendTranscript(
              session.toyWs,
              ChatRole.ASSISTANT,
              part.text,
            );
          }
        }
      }

      // C. Interruption Signal (child started speaking while model was outputting audio)
      if (response.serverContent?.interrupted) {
        this.logger.log(
          `🛑 Interruption detected for session [${session.sessionId}]: Notifying toy to FLUSH_SPEAKER`,
        );
        if (session.toyWs.readyState === ClientSocket.OPEN) {
          session.toyWs.send(JSON.stringify({ cmd: 'FLUSH_SPEAKER' }));
        }
      }

      // D. Function / Tool Execution Calls
      if (response.toolCall?.functionCalls) {
        for (const call of response.toolCall.functionCalls) {
          await this.handleToolCall(session, call);
        }
      }
    } catch (err) {
      this.logger.error(
        `Error parsing Gemini message [Session: ${session.sessionId}]: ${err.message}`,
      );
    }
  }

  private async handleToolCall(session: ActiveSession, call: any) {
    const callId = call.id;
    const name = call.name;
    const args = call.args || {};

    this.logger.log(
      `🛠️ Processing function call '${name}' (id: ${callId}) for session [${session.sessionId}]`,
    );

    const result = await this.functionHandler.executeFunction(name, args, {
      userId: session.userId,
      deviceId: session.deviceId,
    });

    // Send tool response back to Gemini so it generates the audio response acknowledging the action
    this.geminiRelay.sendToolResponse(
      session.geminiWs,
      callId,
      name,
      result,
    );
  }

  private handleToySignal(session: ActiveSession, rawText: string) {
    try {
      const msg = JSON.parse(rawText);
      this.logger.log(
        `📨 Toy signal [Session: ${session.sessionId}]: ${JSON.stringify(msg)}`,
      );

      if (msg.event === 'user_text' && typeof msg.text === 'string') {
        this.sessionManager.appendTranscript(
          session.toyWs,
          ChatRole.USER,
          msg.text,
        );
      }
    } catch {
      // Ignore malformed text packets
    }
  }

  private extractTokenFromRequest(request: IncomingMessage): string | null {
    try {
      const parsedUrl = new URL(request.url || '', 'http://localhost');
      const token = parsedUrl.searchParams.get('token');
      if (token) return token;

      // Fallback: Check authorization header if provided in upgrade
      const authHeader = request.headers['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
      }
    } catch {
      return null;
    }
    return null;
  }
}

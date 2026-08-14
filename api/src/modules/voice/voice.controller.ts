import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Req,
  Res,
  UseGuards,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { SttService } from './stt.service';
import { TtsService } from './tts.service';
import { AiService } from './ai.service';
import { AlarmsService } from '../alarms/alarms.service';
import { MessagePlaceholderService } from './message-placeholder.service';
import { DevicesService } from '../devices/devices.service';
import { SseService } from '../sse/sse.service';
import { PushMessageDto } from './dto/push-message.dto';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { DeviceGuard } from '../../common/guards/device.guard';
import {
  ApiVoiceDocs,
  ApiVoiceAssistantDocs,
  ApiVoicePushDocs,
  ApiVoicePushPendingDocs,
  ApiGetSttProviderDocs,
  ApiSetSttProviderDocs,
} from '../../swagger/voice.swagger';

@ApiVoiceDocs()
@Controller('voice')
export class VoiceController {
  private readonly logger = new Logger(VoiceController.name);
  private pushQueue = new Map<string, Buffer[]>();

  constructor(
    private readonly sttService: SttService,
    private readonly ttsService: TtsService,
    private readonly aiService: AiService,
    private readonly alarmsService: AlarmsService,
    private readonly messagePlaceholderService: MessagePlaceholderService,
    private readonly devicesService: DevicesService,
    private readonly sseService: SseService,
  ) {}

  @UseGuards(DeviceGuard)
  @ApiVoiceAssistantDocs()
  @Post('assistant')
  async assistant(
    @AuthUser() device: any,
    @Req() req: Request & { rawBody?: Buffer },
    @Res() res: Response,
  ) {
    let audioBuffer: Buffer;
    if (req.rawBody && req.rawBody.length > 0) {
      audioBuffer = req.rawBody;
    } else {
      audioBuffer = await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', (err) => reject(err));
      });
    }

    if (!audioBuffer || audioBuffer.length < 100) {
      throw new BadRequestException('Audio payload too short or missing');
    }

    const userText = await this.sttService.speechToText(audioBuffer);
    if (!userText || userText.trim().length === 0) {
      return res.status(204).send();
    }

    const userId = device.userId;
    const userPayload = {
      ...device,
      id: device.userId,
      deviceName: device.deviceName || device.name,
    };

    const aiResponse = await this.aiService.askAi(
      device.id,
      userText,
      userPayload,
    );

    // Handle alarm flag from AI response
    if (aiResponse.setAlarm && aiResponse.alarmTime && userId) {
      try {
        this.alarmsService.create({
          userId,
          time: aiResponse.alarmTime,
          label: aiResponse.alarmLabel || undefined,
          enabled: true,
        });
        this.logger.log(
          `⏰ Alarm created via AI for user ${userId} at ${aiResponse.alarmTime}`,
        );
      } catch (err) {
        this.logger.error(`Failed to create alarm via AI flag: ${err.message}`);
      }
    }

    // Handle message sending flag from AI response
    if (aiResponse.sendMessage && userId) {
      try {
        this.messagePlaceholderService.sendMessage({
          userId,
          recipient: aiResponse.messageTo,
          content: aiResponse.messageContent,
        });
      } catch (err) {
        this.logger.error(
          `Failed to process send message via AI flag: ${err.message}`,
        );
      }
    }

    const audioOutput = await this.ttsService.textToSpeech(aiResponse.reply);

    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Disposition', 'inline; filename="response.wav"');
    res.setHeader('X-Audio-Format', 'wav');
    res.setHeader('X-Sample-Rate', '16000');
    return res.status(200).send(audioOutput);
  }

  @ApiVoicePushDocs()
  @Post('push')
  async pushMessage(
    @AuthUser() device: any,
    @Body() pushMessageDto: PushMessageDto,
  ) {
    const audio = await this.ttsService.textToSpeech(pushMessageDto.text);

    if (!this.pushQueue.has(device.macAddress)) {
      this.pushQueue.set(device.macAddress, []);
    }
    this.pushQueue.get(device.macAddress)!.push(audio);

    this.sseService.notifyPendingAudio(device.macAddress);

    return { ok: true, message: 'Audio push queued and SSE notified' };
  }

  @UseGuards(DeviceGuard)
  @ApiVoicePushPendingDocs()
  @Get('push-pending')
  async pushPending(@AuthUser() device: any, @Res() res: Response) {
    const queue = this.pushQueue.get(device.macAddress) || [];

    if (queue.length === 0) {
      return res.status(204).send();
    }

    const audio = queue.shift()!;
    res.setHeader('Content-Type', 'application/octet-stream');
    return res.status(200).send(audio);
  }

  @ApiGetSttProviderDocs()
  @Get('stt-provider')
  getSttProvider() {
    return { provider: this.sttService.getProvider() };
  }

  @ApiSetSttProviderDocs()
  @Post('stt-provider')
  setSttProvider(@Body('provider') provider: 'groq' | 'google') {
    const ok = this.sttService.setProvider(provider);
    if (!ok) {
      throw new BadRequestException("STT provider must be 'groq' or 'google'");
    }
    return { ok: true, provider };
  }
}

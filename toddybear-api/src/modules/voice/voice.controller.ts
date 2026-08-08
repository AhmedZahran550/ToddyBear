import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Req,
  Res,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { SttService } from './stt.service';
import { TtsService } from './tts.service';
import { AiService } from './ai.service';
import { AlarmIntentService } from './alarm-intent.service';
import { DevicesService } from '../devices/devices.service';
import { SseService } from '../sse/sse.service';
import { PushMessageDto } from './dto/push-message.dto';
import { Public } from '../../common/decorators/public.decorator';

@Controller('voice')
export class VoiceController {
  private pushQueue = new Map<string, Buffer[]>();

  constructor(
    private readonly sttService: SttService,
    private readonly ttsService: TtsService,
    private readonly aiService: AiService,
    private readonly alarmIntentService: AlarmIntentService,
    private readonly devicesService: DevicesService,
    private readonly sseService: SseService,
  ) {}

  private async verifyDeviceMac(mac: string) {
    if (!mac) {
      throw new ForbiddenException('Missing X-Device-Mac header');
    }
    const device = await this.devicesService.findByMacAddress(mac);
    if (!device) {
      throw new ForbiddenException('Unregistered device MAC');
    }
    await this.devicesService.markHardwareSeen(mac);
    return device;
  }

  @Public()
  @Post('assistant')
  async assistant(
    @Headers('x-device-mac') mac: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const device = await this.verifyDeviceMac(mac);

    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', async () => {
      const audioBuffer = Buffer.concat(chunks);
      if (audioBuffer.length < 100) {
        return res.status(400).send();
      }

      const userText = await this.sttService.speechToText(audioBuffer);
      if (!userText) {
        return res.status(204).send();
      }

      const alarmReply = await this.alarmIntentService.handleAlarmFlow(device.id, userText);
      const replyText = alarmReply || (await this.aiService.askAi(device.id, userText));

      const audioOutput = await this.ttsService.textToSpeech(replyText);

      res.setHeader('Content-Type', 'application/octet-stream');
      return res.status(200).send(audioOutput);
    });
  }

  @Post('push')
  async pushMessage(
    @Headers('x-device-mac') mac: string,
    @Body() pushMessageDto: PushMessageDto,
  ) {
    const device = await this.verifyDeviceMac(mac);
    const audio = await this.ttsService.textToSpeech(pushMessageDto.text);

    if (!this.pushQueue.has(device.macAddress)) {
      this.pushQueue.set(device.macAddress, []);
    }
    this.pushQueue.get(device.macAddress)!.push(audio);

    this.sseService.notifyPendingAudio(device.macAddress);

    return { ok: true, message: 'Audio push queued and SSE notified' };
  }

  @Public()
  @Get('push-pending')
  async pushPending(
    @Headers('x-device-mac') mac: string,
    @Res() res: Response,
  ) {
    const device = await this.verifyDeviceMac(mac);
    const queue = this.pushQueue.get(device.macAddress) || [];

    if (queue.length === 0) {
      return res.status(204).send();
    }

    const audio = queue.shift()!;
    res.setHeader('Content-Type', 'application/octet-stream');
    return res.status(200).send(audio);
  }

  @Get('stt-provider')
  getSttProvider() {
    return { provider: this.sttService.getProvider() };
  }

  @Post('stt-provider')
  setSttProvider(@Body('provider') provider: 'groq' | 'google') {
    const ok = this.sttService.setProvider(provider);
    if (!ok) {
      throw new BadRequestException("STT provider must be 'groq' or 'google'");
    }
    return { ok: true, provider };
  }
}

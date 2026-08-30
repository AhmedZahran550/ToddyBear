import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  UseGuards,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { TtsService } from './tts.service';
import { DevicesService } from '../devices/devices.service';
import { SseService } from '../sse/sse.service';
import { PushMessageDto } from './dto/push-message.dto';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { DeviceGuard } from '../../common/guards/device.guard';
import {
  ApiVoiceDocs,
  ApiVoicePushDocs,
  ApiVoicePushPendingDocs,
} from '../../swagger/voice.swagger';

@ApiVoiceDocs()
@Controller('voice')
export class VoiceController {
  private readonly logger = new Logger(VoiceController.name);
  private pushQueue = new Map<string, Buffer[]>();

  constructor(
    private readonly ttsService: TtsService,
    private readonly devicesService: DevicesService,
    private readonly sseService: SseService,
  ) {}

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
}

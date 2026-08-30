import { Injectable, Logger } from '@nestjs/common';
import { AlarmsService } from '../alarms/alarms.service';
import { MessagePlaceholderService } from '../voice/message-placeholder.service';

export interface FunctionContext {
  userId: string;
  deviceId: string;
}

@Injectable()
export class GeminiLiveFunctionHandlerService {
  private readonly logger = new Logger(GeminiLiveFunctionHandlerService.name);

  constructor(
    private readonly alarmsService: AlarmsService,
    private readonly messagePlaceholderService: MessagePlaceholderService,
  ) {}

  async executeFunction(
    name: string,
    args: Record<string, any> = {},
    context: FunctionContext,
  ): Promise<Record<string, any>> {
    this.logger.log(
      `🔧 Executing Gemini Live tool: '${name}' with args: ${JSON.stringify(args)} for user: ${context.userId}`,
    );

    try {
      switch (name) {
        case 'setAlarm':
          return await this.handleSetAlarm(args, context);
        case 'disableAlarm':
          return await this.handleDisableAlarm(args, context);
        case 'clearAllAlarms':
          return await this.handleClearAllAlarms(context);
        case 'sendMessage':
          return await this.handleSendMessage(args, context);
        default:
          this.logger.warn(`Unknown tool function called by Gemini: '${name}'`);
          return {
            success: false,
            error: `Unknown tool function: ${name}`,
          };
      }
    } catch (error) {
      this.logger.error(
        `Failed to execute tool '${name}': ${error?.message || error}`,
      );
      return {
        success: false,
        error: error?.message || 'Tool execution failed',
      };
    }
  }

  private async handleSetAlarm(
    args: Record<string, any>,
    context: FunctionContext,
  ): Promise<Record<string, any>> {
    const rawTime = String(args.time || '').trim();
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

    if (!timeRegex.test(rawTime)) {
      return {
        success: false,
        error: `Invalid time format: '${rawTime}'. Must be HH:MM in 24-hour format (e.g. 07:30 or 20:00).`,
      };
    }

    const label = args.label ? String(args.label).trim() : undefined;

    const alarm = await this.alarmsService.create({
      userId: context.userId,
      deviceId: context.deviceId || undefined,
      time: rawTime,
      label,
      enabled: true,
    });

    this.logger.log(
      `⏰ Alarm created via Gemini Live for user ${context.userId} at ${rawTime} (ID: ${alarm.id})`,
    );

    return {
      success: true,
      alarmId: alarm.id,
      time: alarm.time,
      label: alarm.label || null,
      message: `Alarm set successfully for ${rawTime}.`,
    };
  }

  private async handleDisableAlarm(
    args: Record<string, any>,
    context: FunctionContext,
  ): Promise<Record<string, any>> {
    const rawTime = String(args.time || '').trim();
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

    if (!timeRegex.test(rawTime)) {
      return {
        success: false,
        error: `Invalid time format: '${rawTime}'. Must be HH:MM in 24-hour format.`,
      };
    }

    const count = await this.alarmsService.disableByTime(
      context.userId,
      rawTime,
    );

    this.logger.log(
      `🔕 Alarm disabled via Gemini Live for user ${context.userId} at ${rawTime} (${count} affected)`,
    );

    return {
      success: true,
      affectedCount: count,
      message:
        count > 0
          ? `Alarm for ${rawTime} was turned off.`
          : `No active alarm found for ${rawTime}.`,
    };
  }

  private async handleClearAllAlarms(
    context: FunctionContext,
  ): Promise<Record<string, any>> {
    const count = await this.alarmsService.deleteAllByUser(context.userId);

    this.logger.log(
      `🗑️ All alarms cleared via Gemini Live for user ${context.userId} (${count} deleted)`,
    );

    return {
      success: true,
      deletedCount: count,
      message: `All ${count} alarms have been deleted.`,
    };
  }

  private async handleSendMessage(
    args: Record<string, any>,
    context: FunctionContext,
  ): Promise<Record<string, any>> {
    const recipient = String(args.recipient || '').trim();
    const content = String(args.content || '').trim();

    if (!recipient || !content) {
      return {
        success: false,
        error: 'Both recipient and content are required to send a message.',
      };
    }

    await this.messagePlaceholderService.sendMessage({
      userId: context.userId,
      recipient,
      content,
    });

    this.logger.log(
      `✉️ Message dispatched via Gemini Live: to="${recipient}", content="${content}" for user ${context.userId}`,
    );

    return {
      success: true,
      recipient,
      message: `Message sent to ${recipient} successfully.`,
    };
  }
}

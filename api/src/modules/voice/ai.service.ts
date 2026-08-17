import { Injectable, Logger } from '@nestjs/common';
import { ChatsService } from '../chats/chats.service';
import { UsageService } from '../usage/usage.service';
import { ChatRole } from '../../database/entities/chat.entity';
import { AiPromptBuilder } from './ai/ai-prompt.builder';
import { AiProviderService } from './ai/ai-provider.service';
import {
  AiProvider,
  AlarmAction,
  AiResponse,
  ProviderInfo,
  UserProfile,
} from './ai/ai.types';

// Re-export types for backward compatibility across modules
export type { AiProvider, AlarmAction, AiResponse, ProviderInfo, UserProfile };

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly chatsService: ChatsService,
    private readonly usageService: UsageService,
    private readonly promptBuilder: AiPromptBuilder,
    private readonly providerService: AiProviderService,
  ) {}

  getProviderInfo(): ProviderInfo {
    return this.providerService.getProviderInfo();
  }

  setProvider(provider: AiProvider, model?: string): boolean {
    return this.providerService.setProvider(provider, model);
  }

  async askAi(
    deviceId: string,
    userText: string,
    user?: UserProfile | null,
  ): Promise<AiResponse> {
    const errorFallback = this.promptBuilder.getErrorFallbackResponse();

    const userId =
      (user as any)?.type === 'device'
        ? user?.userId
        : user?.userId || user?.id;

    const deviceName = user?.deviceName || null;

    // Parallelize user chat persistence and history retrieval
    const [, history] = await Promise.all([
      this.chatsService.create({
        userId: userId || undefined,
        deviceId,
        role: ChatRole.USER,
        content: userText,
      }),
      this.chatsService.findRecentHistory(userId, deviceId, 10),
    ]);

    // Build system prompt with child context, device name, and date/time
    const systemPrompt = this.promptBuilder.buildSystemPrompt(user, deviceName);

    try {
      // Execute model provider with automatic failover
      const { rawContent, usage, usedProvider, usedModel } =
        await this.providerService.executeWithFallback({
          systemPrompt,
          history,
          userText,
        });

      // Parse structured JSON response
      const aiParsedResponse = this.promptBuilder.parseAiResponse(rawContent);

      // Fire-and-forget: Log token consumption without blocking audio generation
      if (usage && userId) {
        this.usageService
          .logTokens({
            promptTokens: usage.prompt_tokens || 0,
            completionTokens: usage.completion_tokens || 0,
            totalTokens: usage.total_tokens || 0,
            model: `${usedProvider}:${usedModel}`,
            userId,
          })
          .catch((err) =>
            this.logger.error(`Failed to log token usage: ${err.message}`),
          );
      }

      // Fire-and-forget: Save assistant chat response
      this.chatsService
        .create({
          userId: userId || undefined,
          deviceId,
          role: ChatRole.ASSISTANT,
          content: aiParsedResponse.reply,
        })
        .catch((err) =>
          this.logger.error(
            `Failed to save assistant chat reply: ${err.message}`,
          ),
        );

      this.logger.log(
        `🤖 AI (${usedProvider}:${usedModel}) -> reply: "${aiParsedResponse.reply}" | alarms: ${JSON.stringify(aiParsedResponse.alarms)} | clearAllAlarms: ${aiParsedResponse.clearAllAlarms} | sendMessage: ${aiParsedResponse.sendMessage} (${aiParsedResponse.messageTo})`,
      );

      return aiParsedResponse;
    } catch (error) {
      this.logger.error(
        `❌ askAi execution failed: ${error?.message || error}`,
      );
      return errorFallback;
    }
  }
}

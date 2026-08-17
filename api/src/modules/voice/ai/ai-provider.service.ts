import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Chat, ChatRole } from '../../../database/entities/chat.entity';
import {
  AiProvider,
  ProviderExecutionResult,
  ProviderInfo,
  TokenUsage,
} from './ai.types';

@Injectable()
export class AiProviderService {
  private readonly logger = new Logger(AiProviderService.name);
  private provider: AiProvider = 'gemini';
  private geminiModel: string = 'gemini-3.6-flash';
  private groqModel: string = 'openai/gpt-oss-20b';

  constructor(private readonly configService: ConfigService) {
    const providerEnv = this.configService.get<string>('AI_PROVIDER', 'gemini');
    if (providerEnv === 'gemini' || providerEnv === 'groq') {
      this.provider = providerEnv;
    }
    this.geminiModel = this.configService.get<string>(
      'GEMINI_MODEL',
      'gemini-3.6-flash',
    );
    this.groqModel = this.configService.get<string>(
      'GROQ_MODEL',
      'openai/gpt-oss-20b',
    );
  }

  getProviderInfo(): ProviderInfo {
    return {
      activeProvider: this.provider,
      activeModel: this.getActiveModel(this.provider),
      geminiModel: this.geminiModel,
      groqModel: this.groqModel,
      availableProviders: ['gemini', 'groq'],
    };
  }

  getActiveModel(provider: AiProvider): string {
    return provider === 'gemini' ? this.geminiModel : this.groqModel;
  }

  setProvider(provider: AiProvider, model?: string): boolean {
    if (provider !== 'gemini' && provider !== 'groq') {
      return false;
    }
    this.provider = provider;
    if (model && model.trim()) {
      if (provider === 'gemini') {
        this.geminiModel = model.trim();
      } else {
        this.groqModel = model.trim();
      }
    }
    this.logger.log(
      `🔁 AI Provider changed to: ${provider} (model: ${this.getActiveModel(provider)})`,
    );
    return true;
  }

  private async callGemini(
    model: string,
    systemPrompt: string,
    history: Chat[],
    userText: string,
  ): Promise<{ rawContent: string; usage?: TokenUsage }> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const contents: Array<{
      role: 'user' | 'model';
      parts: Array<{ text: string }>;
    }> = [];

    // Map conversation history
    for (const h of history) {
      contents.push({
        role: h.role === ChatRole.USER ? 'user' : 'model',
        parts: [{ text: h.content }],
      });
    }

    // Add current user text
    contents.push({
      role: 'user',
      parts: [{ text: userText }],
    });

    const payload = {
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 400,
        responseMimeType: 'application/json',
      },
    };

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      payload,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      },
    );

    const rawContent =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    const usageMetadata = response.data?.usageMetadata;

    const usage: TokenUsage | undefined = usageMetadata
      ? {
          prompt_tokens: usageMetadata.promptTokenCount || 0,
          completion_tokens: usageMetadata.candidatesTokenCount || 0,
          total_tokens: usageMetadata.totalTokenCount || 0,
        }
      : undefined;

    return { rawContent, usage };
  }

  private async callGroq(
    model: string,
    systemPrompt: string,
    history: Chat[],
    userText: string,
  ): Promise<{ rawContent: string; usage?: TokenUsage }> {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is not configured');
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map((h) => ({
        role: h.role === ChatRole.USER ? 'user' : 'assistant',
        content: h.content,
      })),
      { role: 'user', content: userText },
    ];

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model,
        messages,
        temperature: 0.7,
        max_completion_tokens: 300,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      },
    );

    const rawContent =
      response.data?.choices?.[0]?.message?.content?.trim() || '';
    const usage = response.data?.usage;

    return { rawContent, usage };
  }

  private async executeProvider(
    provider: AiProvider,
    model: string,
    systemPrompt: string,
    history: Chat[],
    userText: string,
  ): Promise<{ rawContent: string; usage?: TokenUsage }> {
    if (provider === 'gemini') {
      return this.callGemini(model, systemPrompt, history, userText);
    } else {
      return this.callGroq(model, systemPrompt, history, userText);
    }
  }

  async executeWithFallback(params: {
    systemPrompt: string;
    history: Chat[];
    userText: string;
  }): Promise<ProviderExecutionResult> {
    const primaryProvider = this.provider;
    const primaryModel = this.getActiveModel(primaryProvider);
    const fallbackProvider: AiProvider =
      primaryProvider === 'gemini' ? 'groq' : 'gemini';
    const fallbackModel = this.getActiveModel(fallbackProvider);

    try {
      const result = await this.executeProvider(
        primaryProvider,
        primaryModel,
        params.systemPrompt,
        params.history,
        params.userText,
      );

      return {
        rawContent: result.rawContent,
        usage: result.usage,
        usedProvider: primaryProvider,
        usedModel: primaryModel,
      };
    } catch (primaryError) {
      const primaryErrMsg =
        primaryError?.response?.data?.error?.message ||
        primaryError?.message ||
        'Unknown error';
      this.logger.warn(
        `⚠️ Primary AI Provider (${primaryProvider}:${primaryModel}) failed: ${primaryErrMsg}. Attempting fallback to ${fallbackProvider}:${fallbackModel}...`,
      );

      try {
        const fallbackResult = await this.executeProvider(
          fallbackProvider,
          fallbackModel,
          params.systemPrompt,
          params.history,
          params.userText,
        );

        this.logger.log(
          `✅ Fallback AI Provider (${fallbackProvider}:${fallbackModel}) succeeded!`,
        );

        return {
          rawContent: fallbackResult.rawContent,
          usage: fallbackResult.usage,
          usedProvider: fallbackProvider,
          usedModel: fallbackModel,
        };
      } catch (fallbackError) {
        const fallbackErrMsg =
          fallbackError?.response?.data?.error?.message ||
          fallbackError?.message ||
          'Unknown error';
        this.logger.error(
          `❌ Both AI providers failed! Primary (${primaryProvider}:${primaryModel}): ${primaryErrMsg} | Fallback (${fallbackProvider}:${fallbackModel}): ${fallbackErrMsg}`,
        );
        throw new Error(
          `All AI providers failed. Primary: ${primaryErrMsg}, Fallback: ${fallbackErrMsg}`,
        );
      }
    }
  }
}

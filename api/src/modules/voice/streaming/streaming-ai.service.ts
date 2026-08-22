import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Readable } from 'stream';
import { ChatsService } from '../../chats/chats.service';
import { UsageService } from '../../usage/usage.service';
import { ChatRole } from '../../../database/entities/chat.entity';
import { AiPromptBuilder } from '../ai/ai-prompt.builder';
import {
  AiProvider,
  AiResponse,
  TokenUsage,
  UserProfile,
} from '../ai/ai.types';

export type StreamingAiEvent =
  | { type: 'token'; text: string }
  | { type: 'sentence'; text: string; index: number }
  | { type: 'complete'; response: AiResponse; fullRaw: string; usage?: TokenUsage };

@Injectable()
export class StreamingAiService {
  private readonly logger = new Logger(StreamingAiService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly chatsService: ChatsService,
    private readonly usageService: UsageService,
    private readonly promptBuilder: AiPromptBuilder,
  ) {}

  /**
   * Async generator that streams sentence chunks for real-time TTS
   * and yields a final complete AiResponse containing parsed action fields (alarms, etc.).
   */
  async *askAiStream(
    deviceId: string,
    userText: string,
    user?: UserProfile | null,
    onFirstToken?: () => void,
    signal?: AbortSignal,
  ): AsyncGenerator<StreamingAiEvent, void, unknown> {
    const userId =
      (user as any)?.type === 'device'
        ? user?.userId
        : user?.userId || user?.id;
    const deviceName = user?.deviceName || null;

    // Parallelize user chat persistence and history retrieval (capped at 6 for voice latency)
    const [, history] = await Promise.all([
      this.chatsService.create({
        userId: userId || undefined,
        deviceId,
        role: ChatRole.USER,
        content: userText,
      }),
      this.chatsService.findRecentHistory(userId, deviceId, 6),
    ]);

    const systemPrompt = this.promptBuilder.buildSystemPrompt(user, deviceName);
    const primaryProvider = (this.configService.get<string>('AI_PROVIDER', 'groq') as AiProvider) || 'groq';
    const fallbackProvider: AiProvider = primaryProvider === 'groq' ? 'gemini' : 'groq';

    let tokenStream: AsyncIterable<string>;
    let usedProvider: AiProvider = primaryProvider;

    try {
      tokenStream = await this.createTokenStream(primaryProvider, systemPrompt, history, userText, signal);
    } catch (primaryErr) {
      if (signal?.aborted) return;
      this.logger.warn(
        `⚠️ Primary stream (${primaryProvider}) failed: ${primaryErr.message}. Falling back to ${fallbackProvider}...`,
      );
      try {
        tokenStream = await this.createTokenStream(fallbackProvider, systemPrompt, history, userText, signal);
        usedProvider = fallbackProvider;
      } catch (fallbackErr) {
        if (signal?.aborted) return;
        this.logger.error(`❌ Both streaming AI providers failed: ${fallbackErr.message}`);
        const fallbackResp = this.promptBuilder.getErrorFallbackResponse();
        yield { type: 'sentence', text: fallbackResp.reply, index: 0 };
        yield { type: 'complete', response: fallbackResp, fullRaw: '' };
        return;
      }
    }

    let fullRawAccumulated = '';
    let replyExtractor = new StreamingReplyExtractor();
    let sentenceIndex = 0;
    let firstTokenNotified = false;

    for await (const token of tokenStream) {
      if (signal?.aborted) {
        this.logger.log('🛑 AI token stream aborted by client disconnect');
        return;
      }

      if (!firstTokenNotified && token.trim().length > 0) {
        firstTokenNotified = true;
        if (onFirstToken) onFirstToken();
      }

      fullRawAccumulated += token;
      yield { type: 'token', text: token };

      const sentence = replyExtractor.feed(token);
      if (sentence) {
        yield { type: 'sentence', text: sentence, index: sentenceIndex++ };
      }
    }

    if (signal?.aborted) return;

    // Flush any remaining buffered reply text
    const finalSentence = replyExtractor.flush();
    if (finalSentence) {
      yield { type: 'sentence', text: finalSentence, index: sentenceIndex++ };
    }

    // Parse structured JSON response
    const parsedResponse = this.promptBuilder.parseAiResponse(fullRawAccumulated);

    // If reply was empty from streaming extractor, use the parsed reply
    if (sentenceIndex === 0 && parsedResponse.reply) {
      yield { type: 'sentence', text: parsedResponse.reply, index: 0 };
    }

    // Fire-and-forget: Save assistant chat response
    this.chatsService
      .create({
        userId: userId || undefined,
        deviceId,
        role: ChatRole.ASSISTANT,
        content: parsedResponse.reply,
      })
      .catch((err) =>
        this.logger.error(`Failed to save assistant chat reply: ${err.message}`),
      );

    this.logger.log(
      `🤖 Streaming AI (${usedProvider}) completed -> reply: "${parsedResponse.reply}" | alarms: ${JSON.stringify(parsedResponse.alarms)}`,
    );

    yield {
      type: 'complete',
      response: parsedResponse,
      fullRaw: fullRawAccumulated,
    };
  }

  private async createTokenStream(
    provider: AiProvider,
    systemPrompt: string,
    history: any[],
    userText: string,
    signal?: AbortSignal,
  ): Promise<AsyncIterable<string>> {
    if (provider === 'groq') {
      return this.createGroqStream(systemPrompt, history, userText, signal);
    } else {
      return this.createGeminiStream(systemPrompt, history, userText, signal);
    }
  }

  private async createGroqStream(
    systemPrompt: string,
    history: any[],
    userText: string,
    signal?: AbortSignal,
  ): Promise<AsyncIterable<string>> {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    const model = this.configService.get<string>('GROQ_MODEL', 'openai/gpt-oss-20b');

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
        max_completion_tokens: 250, // Capped for low latency voice responses
        response_format: { type: 'json_object' },
        stream: true,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        responseType: 'stream',
        timeout: 20000,
        signal,
      },
    );

    return this.parseOpenAiSseStream(response.data, signal);
  }

  private async createGeminiStream(
    systemPrompt: string,
    history: any[],
    userText: string,
    signal?: AbortSignal,
  ): Promise<AsyncIterable<string>> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    const model = this.configService.get<string>('GEMINI_MODEL', 'gemini-3.6-flash');

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
    for (const h of history) {
      contents.push({
        role: h.role === ChatRole.USER ? 'user' : 'model',
        parts: [{ text: h.content }],
      });
    }
    contents.push({
      role: 'user',
      parts: [{ text: userText }],
    });

    const payload = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 300,
        responseMimeType: 'application/json',
      },
    };

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
      payload,
      {
        headers: { 'Content-Type': 'application/json' },
        responseType: 'stream',
        timeout: 20000,
        signal,
      },
    );

    return this.parseGeminiSseStream(response.data, signal);
  }

  private async *parseOpenAiSseStream(stream: Readable, signal?: AbortSignal): AsyncIterable<string> {
    let buffer = '';
    try {
      for await (const chunk of stream) {
        if (signal?.aborted) {
          stream.destroy();
          return;
        }
        buffer += chunk.toString('utf8');
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          const dataStr = trimmed.replace(/^data:\s*/, '');
          if (dataStr === '[DONE]') return;

          try {
            const json = JSON.parse(dataStr);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) yield delta;
          } catch {
            // ignore incomplete lines
          }
        }
      }
    } finally {
      if (signal?.aborted && !stream.destroyed) {
        stream.destroy();
      }
    }
  }

  private async *parseGeminiSseStream(stream: Readable, signal?: AbortSignal): AsyncIterable<string> {
    let buffer = '';
    try {
      for await (const chunk of stream) {
        if (signal?.aborted) {
          stream.destroy();
          return;
        }
        buffer += chunk.toString('utf8');
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          const dataStr = trimmed.replace(/^data:\s*/, '');

          try {
            const json = JSON.parse(dataStr);
            const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) yield text;
          } catch {
            // ignore incomplete lines
          }
        }
      }
    } finally {
      if (signal?.aborted && !stream.destroyed) {
        stream.destroy();
      }
    }
  }
}

/**
 * Extracts spoken reply sentences on the fly from a streaming JSON LLM response.
 * Buffers characters until sentence boundary punctuation is found.
 */
class StreamingReplyExtractor {
  private inReplyField = false;
  private pastReplyField = false;
  private accumulator = '';
  private sentenceBuffer = '';
  private isEscaped = false;

  feed(token: string): string | null {
    if (this.pastReplyField) return null;

    this.accumulator += token;

    if (!this.inReplyField) {
      const match = this.accumulator.match(/"reply"\s*:\s*"/);
      if (match && match.index !== undefined) {
        this.inReplyField = true;
        const startIdx = match.index + match[0].length;
        const remaining = this.accumulator.slice(startIdx);
        this.accumulator = '';
        return this.processReplyChars(remaining);
      }
      return null;
    }

    return this.processReplyChars(token);
  }

  private processReplyChars(text: string): string | null {
    let completedSentence: string | null = null;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (this.isEscaped) {
        this.sentenceBuffer += char;
        this.isEscaped = false;
        continue;
      }

      if (char === '\\') {
        this.isEscaped = true;
        continue;
      }

      if (char === '"') {
        // End of reply string in JSON
        this.inReplyField = false;
        this.pastReplyField = true;
        break;
      }

      this.sentenceBuffer += char;

      // Sentence boundary detection (Arabic + English punctuation)
      if (this.isSentenceBoundary(char, this.sentenceBuffer)) {
        completedSentence = this.sentenceBuffer.trim();
        this.sentenceBuffer = '';
      }
    }

    return completedSentence && completedSentence.length > 0 ? completedSentence : null;
  }

  private isSentenceBoundary(char: string, buffer: string): boolean {
    const isPunctuation =
      char === '.' ||
      char === '!' ||
      char === '?' ||
      char === '؟' ||
      char === '\n' ||
      (char === '،' && buffer.length > 25); // Arabic comma splits if clause is long enough

    return isPunctuation && buffer.trim().length >= 8;
  }

  flush(): string | null {
    const remaining = this.sentenceBuffer.trim();
    this.sentenceBuffer = '';
    return remaining.length > 0 ? remaining : null;
  }
}

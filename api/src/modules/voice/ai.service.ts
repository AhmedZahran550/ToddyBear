import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ChatsService } from '../chats/chats.service';
import { UsageService } from '../usage/usage.service';
import { Chat, ChatRole } from '../../database/entities/chat.entity';

export type AiProvider = 'gemini' | 'groq';

export interface AlarmAction {
  action: 'set' | 'disable';
  time: string;
  label?: string | null;
}

export interface AiResponse {
  reply: string;
  alarms: AlarmAction[];
  clearAllAlarms: boolean;
  sendMessage: boolean;
  messageTo: string | null;
  messageContent: string | null;
}

export interface ProviderInfo {
  activeProvider: AiProvider;
  activeModel: string;
  geminiModel: string;
  groqModel: string;
  availableProviders: AiProvider[];
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private provider: AiProvider = 'gemini';
  private geminiModel: string = 'gemini-3.6-flash';
  private groqModel: string = 'openai/gpt-oss-20b';

  constructor(
    private readonly configService: ConfigService,
    private readonly chatsService: ChatsService,
    private readonly usageService: UsageService,
  ) {
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

  private getCurrentDatetimeText(): string {
    const now = new Date();
    const weekdays = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    const weekday = weekdays[now.getDay()];
    const month = months[now.getMonth()];
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    return `Current date and time context: Today is ${weekday}, ${now.getDate()} ${month} ${now.getFullYear()}, and current local time is ${hours}:${minutes}. Use this information if asked about day, date, or time.`;
  }

  private getSystemPromptForUser(
    user?: {
      name?: string;
      userName?: string;
      firstName?: string;
      lastName?: string;
      preferredName?: string;
      age?: number | string;
      gender?: string;
      deviceName?: string;
    } | null,
    deviceName?: string | null,
  ): string {
    const datetimeText = this.getCurrentDatetimeText();
    const assistantName =
      deviceName?.trim() || user?.deviceName?.trim() || 'Toddy';

    const childName =
      user?.preferredName ||
      user?.firstName ||
      user?.userName ||
      (user as any)?.name ||
      'Child';
    const age = user?.age ? `${user.age} years old` : 'child';
    const genderDesc =
      user?.gender === 'boy' ? 'boy' : user?.gender === 'girl' ? 'girl' : 'child';

    return `Your name is '${assistantName}'. You are a cute teddy bear, a smart voice assistant, and a close friend to a ${genderDesc} named '${childName}' (${age}).
If asked who you are or what your name is, answer warmly that your name is '${assistantName}'.
Your tone must be warm, encouraging, friendly, and strictly age-appropriate. Speak with '${childName}' naturally.
Keep your text response ('reply') concise and clear so it can be easily converted to audio speech. Do NOT use markdown formatting or emojis in 'reply'.
Reply in the user's spoken language (e.g. if the child speaks Arabic, write 'reply' in spoken friendly Arabic).

IMPORTANT INSTRUCTION FOR JSON OUTPUT:
You MUST ALWAYS respond strictly with a valid JSON object matching this schema:
{
  "reply": "<your warm spoken response to the child in the child's language>",
  "alarms": [
    {
      "action": "set" or "disable",
      "time": "<HH:MM 24-hour format string>",
      "label": "<short label string if alarm has a purpose, otherwise null>"
    }
  ],
  "clearAllAlarms": <boolean true/false>,
  "sendMessage": <boolean true/false>,
  "messageTo": "<recipient name string if sendMessage is true, otherwise null>",
  "messageContent": "<the text of the message if sendMessage is true, otherwise null>"
}

Action Rules:
1. "alarms": An array of alarm actions. Return an empty array [] if no alarm operation is requested.
   - For each alarm the user wants to set, add an entry: {"action": "set", "time": "HH:MM", "label": "<optional label or null>"} in 24-hour format "HH:MM" (e.g. "07:30" or "20:00"). If the user asks to set multiple alarms (e.g. "set alarm for 7:00 and 8:30"), include each in the array. If no time is specified yet, ask for the time in "reply" and return [].
   - For each alarm the user wants to disable / cancel / delete / stop (e.g. "cancel my 7:30 alarm", "turn off the 8 o'clock alarm", "disable alarms at 7 and 8"), add an entry: {"action": "disable", "time": "HH:MM", "label": null}.
2. "clearAllAlarms": Set to true IF AND ONLY IF the user explicitly asks to clear, delete, remove, cancel, or stop ALL their alarms (e.g. "clear all alarms", "delete all my alarms", "cancel all alarms", "مسح كل المنبهات", "احذف كل المنبهات"). Otherwise set to false.
3. "sendMessage": Set to true IF AND ONLY IF the user asks to send a message to someone (e.g. dad, mom, parent). Extract recipient name into "messageTo" and message text into "messageContent".
4. For standard conversation with no alarm or message request, return "alarms": [], "clearAllAlarms": false, and "sendMessage": false.

${datetimeText}`;
  }

  private parseAiResponse(raw: string): AiResponse {
    const fallback: AiResponse = {
      reply: raw || 'معذرة، لم أستطع إجابة سؤالك الآن.',
      alarms: [],
      clearAllAlarms: false,
      sendMessage: false,
      messageTo: null,
      messageContent: null,
    };

    if (!raw) return fallback;

    try {
      let cleaned = raw.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const parsed = JSON.parse(cleaned);

      const alarms: AlarmAction[] = [];
      if (Array.isArray(parsed.alarms)) {
        for (const item of parsed.alarms) {
          if (
            item &&
            (item.action === 'set' || item.action === 'disable') &&
            typeof item.time === 'string' &&
            item.time.trim().length > 0
          ) {
            alarms.push({
              action: item.action,
              time: item.time.trim(),
              label:
                typeof item.label === 'string' ? item.label.trim() : null,
            });
          }
        }
      } else if (parsed.setAlarm && typeof parsed.alarmTime === 'string') {
        // Backward compatibility if single setAlarm format returned
        alarms.push({
          action: 'set',
          time: parsed.alarmTime.trim(),
          label:
            typeof parsed.alarmLabel === 'string'
              ? parsed.alarmLabel.trim()
              : null,
        });
      }

      return {
        reply: typeof parsed.reply === 'string' ? parsed.reply : fallback.reply,
        alarms,
        clearAllAlarms: Boolean(parsed.clearAllAlarms),
        sendMessage: Boolean(parsed.sendMessage),
        messageTo:
          typeof parsed.messageTo === 'string' ? parsed.messageTo : null,
        messageContent:
          typeof parsed.messageContent === 'string'
            ? parsed.messageContent
            : null,
      };
    } catch (err) {
      this.logger.warn(
        `Failed to parse AI JSON response: ${err.message}. Raw string: ${raw}`,
      );
      return fallback;
    }
  }

  private async callGemini(
    model: string,
    systemPrompt: string,
    history: Chat[],
    userText: string,
  ): Promise<{ rawContent: string; usage?: any }> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

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

    const usage = usageMetadata
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
  ): Promise<{ rawContent: string; usage?: any }> {
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
  ): Promise<{ rawContent: string; usage?: any }> {
    if (provider === 'gemini') {
      return this.callGemini(model, systemPrompt, history, userText);
    } else {
      return this.callGroq(model, systemPrompt, history, userText);
    }
  }

  async askAi(
    deviceId: string,
    userText: string,
    user?: {
      id?: string;
      userId?: string;
      name?: string;
      userName?: string;
      firstName?: string;
      lastName?: string;
      preferredName?: string;
      age?: number | string;
      gender?: string;
      deviceName?: string;
    } | null,
  ): Promise<AiResponse> {
    const errorFallback: AiResponse = {
      reply: 'معذرة، نواجه مشكلة في الخدمة حالياً.',
      alarms: [],
      clearAllAlarms: false,
      sendMessage: false,
      messageTo: null,
      messageContent: null,
    };

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

    const systemPrompt = this.getSystemPromptForUser(user, deviceName);

    const primaryProvider = this.provider;
    const primaryModel = this.getActiveModel(primaryProvider);
    const fallbackProvider: AiProvider =
      primaryProvider === 'gemini' ? 'groq' : 'gemini';
    const fallbackModel = this.getActiveModel(fallbackProvider);

    let rawContent = '';
    let usage: any = null;
    let usedProvider: AiProvider = primaryProvider;
    let usedModel = primaryModel;

    try {
      const result = await this.executeProvider(
        primaryProvider,
        primaryModel,
        systemPrompt,
        history,
        userText,
      );
      rawContent = result.rawContent;
      usage = result.usage;
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
          systemPrompt,
          history,
          userText,
        );
        rawContent = fallbackResult.rawContent;
        usage = fallbackResult.usage;
        usedProvider = fallbackProvider;
        usedModel = fallbackModel;
        this.logger.log(
          `✅ Fallback AI Provider (${fallbackProvider}:${fallbackModel}) succeeded!`,
        );
      } catch (fallbackError) {
        const fallbackErrMsg =
          fallbackError?.response?.data?.error?.message ||
          fallbackError?.message ||
          'Unknown error';
        this.logger.error(
          `❌ Both AI providers failed! Primary (${primaryProvider}:${primaryModel}): ${primaryErrMsg} | Fallback (${fallbackProvider}:${fallbackModel}): ${fallbackErrMsg}`,
        );
        return errorFallback;
      }
    }

    const aiParsedResponse = this.parseAiResponse(rawContent);

    // Fire-and-forget: Log AI token consumption in background without blocking TTS
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

    // Fire-and-forget: Save assistant reply in background without blocking TTS
    this.chatsService
      .create({
        userId: userId || undefined,
        deviceId,
        role: ChatRole.ASSISTANT,
        content: aiParsedResponse.reply,
      })
      .catch((err) =>
        this.logger.error(`Failed to save assistant chat reply: ${err.message}`),
      );

    this.logger.log(
      `🤖 AI (${usedProvider}:${usedModel}) -> reply: "${aiParsedResponse.reply}" | alarms: ${JSON.stringify(aiParsedResponse.alarms)} | clearAllAlarms: ${aiParsedResponse.clearAllAlarms} | sendMessage: ${aiParsedResponse.sendMessage} (${aiParsedResponse.messageTo})`,
    );

    return aiParsedResponse;
  }
}



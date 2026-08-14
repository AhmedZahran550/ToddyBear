import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ChatsService } from '../chats/chats.service';
import { UsageService } from '../usage/usage.service';
import { ChatRole } from '../../database/entities/chat.entity';

export interface AiResponse {
  reply: string;
  setAlarm: boolean;
  sendMessage: boolean;
  alarmTime: string | null;
  alarmLabel: string | null;
  messageTo: string | null;
  messageContent: string | null;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly chatsService: ChatsService,
    private readonly usageService: UsageService,
  ) {}

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
  "setAlarm": <boolean true/false>,
  "sendMessage": <boolean true/false>,
  "alarmTime": "<HH:MM 24-hour format string if setAlarm is true, otherwise null>",
  "alarmLabel": "<short label string if alarm has a purpose, otherwise null>",
  "messageTo": "<recipient name string if sendMessage is true, otherwise null>",
  "messageContent": "<the text of the message if sendMessage is true, otherwise null>"
}

Action Rules:
1. "setAlarm": Set to true IF AND ONLY IF the user is asking to set an alarm, reminder, or wake-up alert. Extract "alarmTime" in 24-hour format "HH:MM" (e.g. "07:30" or "20:00"). If no time is specified yet, ask for the time in "reply" and set "setAlarm" to false.
2. "sendMessage": Set to true IF AND ONLY IF the user asks to send a message to someone (e.g. dad, mom, parent). Extract recipient name into "messageTo" and message text into "messageContent".
3. For standard conversation, set "setAlarm": false and "sendMessage": false.

${datetimeText}`;
  }

  private parseAiResponse(raw: string): AiResponse {
    const fallback: AiResponse = {
      reply: raw || 'معذرة، لم أستطع إجابة سؤالك الآن.',
      setAlarm: false,
      sendMessage: false,
      alarmTime: null,
      alarmLabel: null,
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
      return {
        reply: typeof parsed.reply === 'string' ? parsed.reply : fallback.reply,
        setAlarm: Boolean(parsed.setAlarm),
        sendMessage: Boolean(parsed.sendMessage),
        alarmTime:
          typeof parsed.alarmTime === 'string' ? parsed.alarmTime : null,
        alarmLabel:
          typeof parsed.alarmLabel === 'string' ? parsed.alarmLabel : null,
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
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    const model = 'llama-3.3-70b-versatile';

    const errorFallback: AiResponse = {
      reply: 'معذرة، نواجه مشكلة في الخدمة حالياً.',
      setAlarm: false,
      sendMessage: false,
      alarmTime: null,
      alarmLabel: null,
      messageTo: null,
      messageContent: null,
    };

    if (!apiKey) {
      this.logger.error('GROQ_API_KEY is not configured');
      return errorFallback;
    }

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

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map((h) => ({
        role: h.role === ChatRole.USER ? 'user' : 'assistant',
        content: h.content,
      })),
      { role: 'user', content: userText },
    ];

    try {
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

      const aiParsedResponse = this.parseAiResponse(rawContent);

      // Fire-and-forget: Log AI token consumption in background without blocking TTS
      if (usage && userId) {
        this.usageService
          .logTokens({
            promptTokens: usage.prompt_tokens || 0,
            completionTokens: usage.completion_tokens || 0,
            totalTokens: usage.total_tokens || 0,
            model,
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
        `🤖 AI -> reply: "${aiParsedResponse.reply}" | setAlarm: ${aiParsedResponse.setAlarm} (${aiParsedResponse.alarmTime}) | sendMessage: ${aiParsedResponse.sendMessage} (${aiParsedResponse.messageTo})`,
      );

      return aiParsedResponse;
    } catch (error) {
      this.logger.error(
        `❌ Groq Chat Error: ${error?.response?.data?.error?.message || error?.message}`,
      );
      return {
        ...errorFallback,
        reply: 'معذرة، لم أستطع إجابة سؤالك الآن.',
      };
    }
  }
}



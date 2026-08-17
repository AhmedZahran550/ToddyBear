import { Injectable, Logger } from '@nestjs/common';
import { AiResponse, AlarmAction, UserProfile } from './ai.types';

@Injectable()
export class AiPromptBuilder {
  private readonly logger = new Logger(AiPromptBuilder.name);

  getCurrentDatetimeText(): string {
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

  buildSystemPrompt(
    user?: UserProfile | null,
    deviceName?: string | null,
  ): string {
    const datetimeText = this.getCurrentDatetimeText();
    const assistantName =
      deviceName?.trim() || user?.deviceName?.trim() || 'Toddy';

    const childName =
      user?.preferredName ||
      user?.firstName ||
      user?.userName ||
      user?.name ||
      'Child';
    const age = user?.age ? `${user.age} years old` : 'child';
    const genderDesc =
      user?.gender === 'boy'
        ? 'boy'
        : user?.gender === 'girl'
          ? 'girl'
          : 'child';

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

  parseAiResponse(raw: string): AiResponse {
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

  getErrorFallbackResponse(message?: string): AiResponse {
    return {
      reply: message || 'معذرة، نواجه مشكلة في الخدمة حالياً.',
      alarms: [],
      clearAllAlarms: false,
      sendMessage: false,
      messageTo: null,
      messageContent: null,
    };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { DevicesService } from '../devices/devices.service';
import { ChatsService } from '../chats/chats.service';
import { UsageService } from '../usage/usage.service';
import { ChatRole } from '../../database/entities/chat.entity';
import { User } from '../../database/entities/user.entity';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly devicesService: DevicesService,
    private readonly chatsService: ChatsService,
    private readonly usageService: UsageService,
  ) {}

  private getCurrentDatetimeArabic(): string {
    const now = new Date();
    const weekdays = [
      'الأحد',
      'الإثنين',
      'الثلاثاء',
      'الأربعاء',
      'الخميس',
      'الجمعة',
      'السبت',
    ];
    const months = [
      'يناير',
      'فبراير',
      'مارس',
      'أبريل',
      'مايو',
      'يونيو',
      'يوليو',
      'أغسطس',
      'سبتمبر',
      'أكتوبر',
      'نوفمبر',
      'ديسمبر',
    ];

    const weekday = weekdays[now.getDay()];
    const month = months[now.getMonth()];
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    return `معلومة مهمة عن الوقت الحالي: النهارده يوم ${weekday} الموافق ${now.getDate()} ${month} ${now.getFullYear()}، والساعة دلوقتي ${hours}:${minutes}. استخدم المعلومة دي لو الطفل سأل عن التاريخ أو اليوم أو الوقت، وماتقولش إنك مش عارف.`;
  }

  private getSystemPromptForUser(
    user?: { name?: string; userName?: string; firstName?: string; preferredName?: string; age?: number | string; gender?: string } | null,
  ): string {
    const datetimeText = this.getCurrentDatetimeArabic();

    if (!user) {
      return `أنت مساعد صوتي ذكي، ردودك لازم تكون مختصرة وواضحة ومناسبة لتتحول لصوت (من غير رموز أو تنسيق ماركداون)، جاوب باللغة اللي المستخدم بيتكلم بيها. ${datetimeText}`;
    }

    const name =
      user.userName ||
      user.preferredName ||
      user.firstName ||
      (user as any).name ||
      'طفل';
    const age = user.age ? `${user.age} سنين` : '';
    const genderDesc =
      user.gender === 'boy' ? 'ولد' : user.gender === 'girl' ? 'بنت' : 'طفل';

    return `أنت مساعد صوتي ذكي وصديق مقرب لطفل اسمه '${name}'${age ? `، عمره ${age}` : ''}، وهو ${genderDesc}. ردودك لازم تكون دافية، مشجعة، ومناسبة تمامًا لعمر ${age || 'الأطفال'}. تكلم معاه باسمه '${name}' بشكل طبيعي وودود. خلي ردودك مختصرة وواضحة عشان تتحول لصوت بسهولة. ما تستخدمش رموز أو تنسيق ماركداون. جاوب باللغة اللي بيتكلم بيها. ${datetimeText}`;
  }

  async askAi(
    deviceId: string,
    userText: string,
    user?: { id?: string; userId?: string; name?: string; userName?: string; firstName?: string; preferredName?: string; age?: number | string; gender?: string } | null,
  ): Promise<string> {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    const model = 'llama-3.3-70b-versatile';

    if (!apiKey) {
      this.logger.error('GROQ_API_KEY is not configured');
      return 'معذرة، نواجه مشكلة في الخدمة حالياً.';
    }

    const userId =
      (user as any)?.type === 'device'
        ? user?.userId
        : user?.userId || user?.id;

    // Save user chat record
    await this.chatsService.create({
      userId: userId || undefined,
      deviceId,
      role: ChatRole.USER,
      content: userText,
    });

    const systemPrompt = this.getSystemPromptForUser(user);
    const history = await this.chatsService.findRecentHistory(
      userId,
      deviceId,
      10,
    );

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
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );

      const reply =
        response.data?.choices?.[0]?.message?.content?.trim() || '';
      const usage = response.data?.usage;

      // Log AI token consumption to usage table
      if (usage && userId) {
        await this.usageService.logTokens({
          promptTokens: usage.prompt_tokens || 0,
          completionTokens: usage.completion_tokens || 0,
          totalTokens: usage.total_tokens || 0,
          model,
          userId,
        });
      }

      // Save assistant reply
      await this.chatsService.create({
        userId: userId || undefined,
        deviceId,
        role: ChatRole.ASSISTANT,
        content: reply,
      });

      this.logger.log(`🤖 AI -> ${reply}`);
      return reply;
    } catch (error) {
      this.logger.error(
        `❌ Groq Chat Error: ${error?.response?.data?.error?.message || error?.message}`,
      );
      return 'معذرة، لم أستطع إجابة سؤالك الآن.';
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';

export interface SendMessagePayload {
  userId: string;
  recipient?: string | null;
  content?: string | null;
}

@Injectable()
export class MessagePlaceholderService {
  private readonly logger = new Logger(MessagePlaceholderService.name);

  async sendMessage(payload: SendMessagePayload): Promise<boolean> {
    this.logger.log(
      `[PLACEHOLDER] Send Message requested by user ${payload.userId}: recipient="${payload.recipient}", content="${payload.content}"`,
    );
    // Placeholder logic for future message dispatching integration
    return true;
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DatabaseService } from '../../database/database.service';
import { Chat } from '../../database/entities/chat.entity';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

@Injectable()
export class ChatsService extends DatabaseService<Chat> {
  constructor(
    @InjectRepository(Chat)
    private readonly chatRepo: Repository<Chat>,
  ) {
    super(chatRepo);
  }

  async findByUser(userId: string, pagination: PaginationQueryDto) {
    return this.findAll(pagination, {
      where: { userId },
      order: { createdAt: 'ASC' },
    });
  }

  async findRecentHistory(userId: string, limit = 12): Promise<Chat[]> {
    return this.chatRepo
      .find({
        where: { userId },
        order: { createdAt: 'DESC' },
        take: limit,
      })
      .then((chats) => chats.reverse());
  }

  async clearByUser(userId: string): Promise<void> {
    await this.chatRepo.delete({ userId });
  }
}

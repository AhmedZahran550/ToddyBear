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

  async findByDevice(deviceId: string, pagination: PaginationQueryDto) {
    return this.findAll(pagination, {
      where: { deviceId },
      order: { createdAt: 'ASC' },
    });
  }

  async findRecentHistory(deviceId: string, limit = 12): Promise<Chat[]> {
    return this.chatRepo.find({
      where: { deviceId },
      order: { createdAt: 'DESC' },
      take: limit,
    }).then((chats) => chats.reverse());
  }

  async clearByDevice(deviceId: string): Promise<void> {
    await this.chatRepo.delete({ deviceId });
  }
}

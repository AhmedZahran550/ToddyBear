import { Controller, Get, Delete, Param, Query } from '@nestjs/common';
import { ChatsService } from './chats.service';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import {
  ApiChatsDocs,
  ApiFindByUserChatsDocs,
  ApiClearByUserChatsDocs,
} from '../../swagger/chats.swagger';

@ApiChatsDocs()
@Controller('users/:userId/chats')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @ApiFindByUserChatsDocs()
  @Get()
  findByUser(
    @Param('userId') userId: string,
    @Query() paginationQuery: PaginationQueryDto,
  ) {
    return this.chatsService.findByUser(userId, paginationQuery);
  }

  @ApiClearByUserChatsDocs()
  @Delete()
  clearByUser(@Param('userId') userId: string) {
    return this.chatsService.clearByUser(userId);
  }
}

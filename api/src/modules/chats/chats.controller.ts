import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
} from '@nestjs/common';
import { ChatsService } from './chats.service';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

@Controller('devices/:deviceId/chats')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @Get()
  findByDevice(
    @Param('deviceId') deviceId: string,
    @Query() paginationQuery: PaginationQueryDto,
  ) {
    return this.chatsService.findByDevice(deviceId, paginationQuery);
  }

  @Delete()
  clearByDevice(@Param('deviceId') deviceId: string) {
    return this.chatsService.clearByDevice(deviceId);
  }
}

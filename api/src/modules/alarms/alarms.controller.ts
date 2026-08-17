import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { AlarmsService } from './alarms.service';
import { CreateAlarmDto } from './dto/create-alarm.dto';
import { UpdateAlarmDto } from './dto/update-alarm.dto';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import {
  ApiAlarmsDocs,
  ApiCreateAlarmDocs,
  ApiFindByUserAlarmsDocs,
  ApiFindOneAlarmDocs,
  ApiUpdateAlarmDocs,
  ApiRemoveAlarmDocs,
  ApiGetAlarmRingtoneDocs,
} from '../../swagger/alarms.swagger';

@ApiAlarmsDocs()
@Controller()
export class AlarmsController {
  constructor(private readonly alarmsService: AlarmsService) {}

  @ApiCreateAlarmDocs()
  @Post('users/:userId/alarms')
  create(
    @Param('userId') userId: string,
    @Body() createAlarmDto: CreateAlarmDto,
  ) {
    return this.alarmsService.create({
      ...createAlarmDto,
      userId,
    });
  }

  @ApiFindByUserAlarmsDocs()
  @Get('users/:userId/alarms')
  findByUser(
    @Param('userId') userId: string,
    @Query() paginationQuery: PaginationQueryDto,
  ) {
    return this.alarmsService.findByUser(userId, paginationQuery);
  }

  @ApiFindOneAlarmDocs()
  @Get('alarms/:id')
  findOne(@Param('id') id: string) {
    return this.alarmsService.findOneById(id);
  }

  @ApiUpdateAlarmDocs()
  @Patch('alarms/:id')
  update(@Param('id') id: string, @Body() updateAlarmDto: UpdateAlarmDto) {
    return this.alarmsService.update(id, updateAlarmDto);
  }

  @ApiRemoveAlarmDocs()
  @Delete('alarms/:id')
  remove(@Param('id') id: string) {
    return this.alarmsService.remove(id);
  }

  @ApiGetAlarmRingtoneDocs()
  @Get('alarms/:id/ringtone')
  async getAlarmRingtone(@Param('id') id: string, @Res() res: Response) {
    const { buffer, contentType, filename } =
      await this.alarmsService.getAlarmRingtone(id);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    return res.status(200).send(buffer);
  }
}

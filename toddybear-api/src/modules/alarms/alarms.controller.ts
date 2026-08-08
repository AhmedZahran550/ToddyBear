import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { AlarmsService } from './alarms.service';
import { CreateAlarmDto } from './dto/create-alarm.dto';
import { UpdateAlarmDto } from './dto/update-alarm.dto';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

@Controller()
export class AlarmsController {
  constructor(private readonly alarmsService: AlarmsService) {}

  @Post('devices/:deviceId/alarms')
  create(
    @Param('deviceId') deviceId: string,
    @Body() createAlarmDto: CreateAlarmDto,
  ) {
    return this.alarmsService.create({
      ...createAlarmDto,
      deviceId,
    });
  }

  @Get('devices/:deviceId/alarms')
  findByDevice(
    @Param('deviceId') deviceId: string,
    @Query() paginationQuery: PaginationQueryDto,
  ) {
    return this.alarmsService.findByDevice(deviceId, paginationQuery);
  }

  @Get('alarms/:id')
  findOne(@Param('id') id: string) {
    return this.alarmsService.findOne(id);
  }

  @Patch('alarms/:id')
  update(@Param('id') id: string, @Body() updateAlarmDto: UpdateAlarmDto) {
    return this.alarmsService.update(id, updateAlarmDto);
  }

  @Delete('alarms/:id')
  remove(@Param('id') id: string) {
    return this.alarmsService.remove(id);
  }
}

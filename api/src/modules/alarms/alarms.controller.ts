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
import {
  ApiAlarmsDocs,
  ApiCreateAlarmDocs,
  ApiFindByDeviceAlarmsDocs,
  ApiFindOneAlarmDocs,
  ApiUpdateAlarmDocs,
  ApiRemoveAlarmDocs,
} from '../../swagger/alarms.swagger';

@ApiAlarmsDocs()
@Controller()
export class AlarmsController {
  constructor(private readonly alarmsService: AlarmsService) {}

  @ApiCreateAlarmDocs()
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

  @ApiFindByDeviceAlarmsDocs()
  @Get('devices/:deviceId/alarms')
  findByDevice(
    @Param('deviceId') deviceId: string,
    @Query() paginationQuery: PaginationQueryDto,
  ) {
    return this.alarmsService.findByDevice(deviceId, paginationQuery);
  }

  @ApiFindOneAlarmDocs()
  @Get('alarms/:id')
  findOne(@Param('id') id: string) {
    return this.alarmsService.findOne(id);
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
}

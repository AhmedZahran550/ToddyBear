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
import { DevicesService } from './devices.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { AuthUser } from '../../common/decorators/auth-user.decorator';

@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post('register')
  register(
    @Body() registerDto: RegisterDeviceDto,
    @AuthUser('id') userId: string,
  ) {
    return this.devicesService.registerDevice(registerDto, userId);
  }

  @Get()
  findAll(
    @Query() paginationQuery: PaginationQueryDto,
    @AuthUser('id') userId: string,
    @AuthUser('type') userType: string,
  ) {
    if (userType === 'user') {
      return this.devicesService.findByUser(userId, paginationQuery);
    }
    return this.devicesService.findAll(paginationQuery);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.devicesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDeviceDto: UpdateDeviceDto) {
    return this.devicesService.update(id, updateDeviceDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.devicesService.remove(id);
  }

  @Get(':id/status')
  async getStatus(@Param('id') id: string) {
    const device = await this.devicesService.findOne(id);
    const ONLINE_THRESHOLD_SECONDS = 20;
    let online = device.isOnline;

    if (device.lastSeenAt) {
      const secondsAgo = (Date.now() - new Date(device.lastSeenAt).getTime()) / 1000;
      online = online && secondsAgo <= ONLINE_THRESHOLD_SECONDS;
    }

    return {
      online,
      lastSeen: device.lastSeenAt,
      macAddress: device.macAddress,
    };
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DevicesService } from './devices.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { EmployeeRole } from '../../database/entities/employee.entity';
import { ConnectDeviceDto } from './dto/connect-device.dto';
import {
  ApiDevicesDocs,
  ApiRegisterDeviceDocs,
  ApiConnectDeviceDocs,
  ApiFindAllDevicesDocs,
  ApiFindOneDeviceDocs,
  ApiUpdateDeviceDocs,
  ApiRemoveDeviceDocs,
  ApiGetDeviceStatusDocs,
} from '../../swagger/devices.swagger';

@ApiDevicesDocs()
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @ApiRegisterDeviceDocs()
  @Post('register')
  @UseGuards(RolesGuard)
  @Roles(EmployeeRole.ADMIN, EmployeeRole.SUPPORT)
  register(@Body() registerDto: RegisterDeviceDto) {
    return this.devicesService.registerDevice(registerDto);
  }

  @ApiConnectDeviceDocs()
  @Post('connect')
  connectDevice(
    @Body() connectDto: ConnectDeviceDto,
    @AuthUser('id') userId: string,
  ) {
    return this.devicesService.connectBySerialNumber(
      connectDto.serialNumber,
      userId,
    );
  }

  @ApiFindAllDevicesDocs()
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

  @ApiFindOneDeviceDocs()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.devicesService.findOneById(id);
  }

  @ApiUpdateDeviceDocs()
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(EmployeeRole.ADMIN, EmployeeRole.SUPPORT)
  update(@Param('id') id: string, @Body() updateDeviceDto: UpdateDeviceDto) {
    return this.devicesService.update(id, updateDeviceDto);
  }

  @ApiRemoveDeviceDocs()
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(EmployeeRole.ADMIN, EmployeeRole.SUPPORT)
  remove(@Param('id') id: string) {
    return this.devicesService.remove(id);
  }

  @ApiGetDeviceStatusDocs()
  @Get(':id/status')
  async getStatus(@Param('id') id: string) {
    const device = await this.devicesService.findOneById(id);
    const ONLINE_THRESHOLD_SECONDS = 20;
    let online = device.isOnline;

    if (device.lastSeenAt) {
      const secondsAgo =
        (Date.now() - new Date(device.lastSeenAt).getTime()) / 1000;
      online = online && secondsAgo <= ONLINE_THRESHOLD_SECONDS;
    }

    return {
      online,
      lastSeen: device.lastSeenAt,
      macAddress: device.macAddress,
      serialNumber: device.serialNumber,
    };
  }
}

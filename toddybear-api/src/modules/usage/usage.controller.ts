import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsageService } from './usage.service';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { EmployeeRole } from '../../database/entities/employee.entity';

@Controller('usage')
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(EmployeeRole.ADMIN, EmployeeRole.SUPPORT)
  findAll(@Query() paginationQuery: PaginationQueryDto) {
    return this.usageService.findAll(paginationQuery);
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(EmployeeRole.ADMIN, EmployeeRole.SUPPORT)
  getOverallStats() {
    return this.usageService.getOverallStats();
  }

  @Get('device/:deviceId')
  findByDevice(
    @Param('deviceId') deviceId: string,
    @Query() paginationQuery: PaginationQueryDto,
  ) {
    return this.usageService.findByDevice(deviceId, paginationQuery);
  }

  @Get('device/:deviceId/stats')
  getDeviceStats(@Param('deviceId') deviceId: string) {
    return this.usageService.getStatsByDevice(deviceId);
  }
}

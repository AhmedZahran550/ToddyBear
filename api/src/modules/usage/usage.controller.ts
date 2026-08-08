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
import {
  ApiUsageDocs,
  ApiFindAllUsageDocs,
  ApiGetOverallStatsDocs,
  ApiFindByDeviceUsageDocs,
  ApiGetDeviceStatsDocs,
} from '../../swagger/usage.swagger';

@ApiUsageDocs()
@Controller('usage')
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @ApiFindAllUsageDocs()
  @Get()
  @UseGuards(RolesGuard)
  @Roles(EmployeeRole.ADMIN, EmployeeRole.SUPPORT)
  findAll(@Query() paginationQuery: PaginationQueryDto) {
    return this.usageService.findAll(paginationQuery);
  }

  @ApiGetOverallStatsDocs()
  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(EmployeeRole.ADMIN, EmployeeRole.SUPPORT)
  getOverallStats() {
    return this.usageService.getOverallStats();
  }

  @ApiFindByDeviceUsageDocs()
  @Get('device/:deviceId')
  findByDevice(
    @Param('deviceId') deviceId: string,
    @Query() paginationQuery: PaginationQueryDto,
  ) {
    return this.usageService.findByDevice(deviceId, paginationQuery);
  }

  @ApiGetDeviceStatsDocs()
  @Get('device/:deviceId/stats')
  getDeviceStats(@Param('deviceId') deviceId: string) {
    return this.usageService.getStatsByDevice(deviceId);
  }
}

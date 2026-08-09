import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { UsageService } from './usage.service';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { EmployeeRole } from '../../database/entities/employee.entity';
import {
  ApiUsageDocs,
  ApiFindAllUsageDocs,
  ApiGetOverallStatsDocs,
  ApiFindByUserUsageDocs,
  ApiGetUserStatsDocs,
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

  @ApiFindByUserUsageDocs()
  @Get('user/:userId')
  findByUser(
    @Param('userId') userId: string,
    @Query() paginationQuery: PaginationQueryDto,
  ) {
    return this.usageService.findByUser(userId, paginationQuery);
  }

  @ApiGetUserStatsDocs()
  @Get('user/:userId/stats')
  getUserStats(@Param('userId') userId: string) {
    return this.usageService.getStatsByUser(userId);
  }
}

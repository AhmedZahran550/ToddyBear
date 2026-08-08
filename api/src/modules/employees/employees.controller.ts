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
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { EmployeeRole } from '../../database/entities/employee.entity';
import {
  ApiEmployeesDocs,
  ApiCreateEmployeeDocs,
  ApiFindAllEmployeesDocs,
  ApiFindOneEmployeeDocs,
  ApiUpdateEmployeeDocs,
  ApiRemoveEmployeeDocs,
} from '../../swagger/employees.swagger';

@ApiEmployeesDocs()
@Controller('employees')
@UseGuards(RolesGuard)
@Roles(EmployeeRole.ADMIN)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @ApiCreateEmployeeDocs()
  @Post()
  create(@Body() createEmployeeDto: CreateEmployeeDto) {
    return this.employeesService.create(createEmployeeDto);
  }

  @ApiFindAllEmployeesDocs()
  @Get()
  findAll(@Query() paginationQuery: PaginationQueryDto) {
    return this.employeesService.findAll(paginationQuery);
  }

  @ApiFindOneEmployeeDocs()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  @ApiUpdateEmployeeDocs()
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
  ) {
    return this.employeesService.update(id, updateEmployeeDto);
  }

  @ApiRemoveEmployeeDocs()
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.employeesService.remove(id);
  }
}

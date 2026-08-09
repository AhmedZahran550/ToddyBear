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
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { EmployeeRole } from '../../database/entities/employee.entity';
import {
  ApiUsersDocs,
  ApiCreateUserDocs,
  ApiFindAllUsersDocs,
  ApiFindOneUserDocs,
  ApiUpdateUserDocs,
  ApiRemoveUserDocs,
} from '../../swagger/users.swagger';

@ApiUsersDocs()
@Controller('users')
@UseGuards(RolesGuard)
@Roles(EmployeeRole.ADMIN, EmployeeRole.SUPPORT)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiCreateUserDocs()
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @ApiFindAllUsersDocs()
  @Get()
  findAll(@Query() paginationQuery: PaginationQueryDto) {
    return this.usersService.findAll(paginationQuery);
  }

  @ApiFindOneUserDocs()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOneById(id);
  }

  @ApiUpdateUserDocs()
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @ApiRemoveUserDocs()
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}

import { IsEmail, IsOptional, IsEnum, IsBoolean, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EmployeeRole } from '../../../database/entities/employee.entity';

export class UpdateEmployeeDto {
  @ApiPropertyOptional({
    description: 'Updated email address',
    example: 'john.doe@toddybear.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Updated password (minimum 6 characters)',
    example: 'NewSecurePass123!',
    minLength: 6,
  })
  @IsOptional()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({
    description: 'Updated full name',
    example: 'John Doe',
  })
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated employee role',
    enum: EmployeeRole,
    example: EmployeeRole.ADMIN,
  })
  @IsOptional()
  @IsEnum(EmployeeRole)
  role?: EmployeeRole;

  @ApiPropertyOptional({
    description: 'Updated active account status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

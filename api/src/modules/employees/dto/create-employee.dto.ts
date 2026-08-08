import { IsEmail, IsNotEmpty, IsEnum, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmployeeRole } from '../../../database/entities/employee.entity';

export class CreateEmployeeDto {
  @ApiProperty({
    description: 'Employee email address',
    example: 'john.doe@toddybear.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Account password (minimum 6 characters)',
    example: 'SecurePass123!',
    minLength: 6,
  })
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({
    description: 'Full name of the employee',
    example: 'John Doe',
  })
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Employee role for RBAC authorization',
    enum: EmployeeRole,
    default: EmployeeRole.SUPPORT,
    example: EmployeeRole.ADMIN,
  })
  @IsOptional()
  @IsEnum(EmployeeRole)
  role?: EmployeeRole;
}

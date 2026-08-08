import { IsEmail, IsOptional, IsEnum, IsBoolean, MinLength } from 'class-validator';
import { EmployeeRole } from '../../../database/entities/employee.entity';

export class UpdateEmployeeDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @MinLength(6)
  password?: string;

  @IsOptional()
  name?: string;

  @IsOptional()
  @IsEnum(EmployeeRole)
  role?: EmployeeRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

import { IsEmail, IsNotEmpty, IsEnum, IsOptional, MinLength } from 'class-validator';
import { EmployeeRole } from '../../../database/entities/employee.entity';

export class CreateEmployeeDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsEnum(EmployeeRole)
  role?: EmployeeRole;
}

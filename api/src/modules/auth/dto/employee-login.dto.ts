import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class EmployeeLoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

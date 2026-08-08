import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EmployeeLoginDto {
  @ApiProperty({
    description: 'Employee email address',
    example: 'admin@toddybear.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Employee password',
    example: 'SecretPassword123!',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}

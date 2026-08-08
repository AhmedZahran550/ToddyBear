import { IsNotEmpty, IsString, IsOptional, IsEmail, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserSignupDto {
  @ApiProperty({
    description: 'First name of the user',
    example: 'Ahmed',
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    description: 'Last name of the user',
    example: 'Zahran',
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    description: 'User age in years',
    example: 28,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  age: number;

  @ApiProperty({
    description: 'User mobile phone number',
    example: '+201234567890',
  })
  @IsString()
  @IsNotEmpty()
  mobileNumber: string;

  @ApiPropertyOptional({
    description: 'User email address',
    example: 'ahmed@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'User preferred display name / nickname',
    example: 'Modi',
  })
  @IsOptional()
  @IsString()
  preferredName?: string;
}

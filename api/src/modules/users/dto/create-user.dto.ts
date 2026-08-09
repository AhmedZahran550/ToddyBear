import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEmail, IsInt, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    description: 'User mobile number',
    example: '+201234567890',
  })
  @IsString()
  @IsNotEmpty()
  mobileNumber: string;

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

  @ApiPropertyOptional({
    description: 'Target gender (boy/girl)',
    enum: ['boy', 'girl'],
    example: 'boy',
  })
  @IsOptional()
  @IsIn(['boy', 'girl'])
  gender?: string;

  @ApiPropertyOptional({
    description: 'User email address',
    example: 'ahmed@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'User preferred display name',
    example: 'Modi',
  })
  @IsOptional()
  @IsString()
  preferredName?: string;

  @ApiPropertyOptional({
    description: 'Mobile verification status',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isMobileVerified?: boolean;

  @ApiPropertyOptional({
    description: 'Email verification status',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isEmailVerified?: boolean;

  @ApiPropertyOptional({
    description: 'Active status of the user account',
    default: true,
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

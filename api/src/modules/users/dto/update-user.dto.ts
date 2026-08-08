import { IsString, IsOptional, IsBoolean, IsEmail } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'Updated first name of the user',
    example: 'Ahmed',
  })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Updated last name of the user',
    example: 'Zahran',
  })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Updated email address',
    example: 'ahmed@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Updated preferred display name',
    example: 'Modi',
  })
  @IsOptional()
  @IsString()
  preferredName?: string;

  @ApiPropertyOptional({
    description: 'Updated mobile verification status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isMobileVerified?: boolean;

  @ApiPropertyOptional({
    description: 'Updated email verification status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isEmailVerified?: boolean;

  @ApiPropertyOptional({
    description: 'Updated active status of the user account',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

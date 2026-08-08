import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({
    description: 'User mobile number',
    example: '+201234567890',
  })
  @IsString()
  @IsNotEmpty()
  mobileNumber: string;

  @ApiProperty({
    description: 'OTP verification code sent via SMS',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  code: string;
}

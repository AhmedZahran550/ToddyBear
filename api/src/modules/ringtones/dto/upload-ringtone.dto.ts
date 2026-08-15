import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadRingtoneDto {
  @ApiProperty({
    description: 'User-friendly display name for the ringtone',
    example: 'Morning Birdsong',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}

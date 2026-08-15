import {
  IsOptional,
  IsString,
  Matches,
  IsBoolean,
  IsUUID,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAlarmDto {
  @ApiPropertyOptional({
    description: 'Updated alarm trigger time in HH:mm format',
    example: '08:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'time must be in HH:mm format',
  })
  time?: string;

  @ApiPropertyOptional({
    description: 'Updated alarm label',
    example: 'School Wake Up Alarm',
  })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({
    description: 'Enable or disable the alarm',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Target Device ID to trigger the alarm on',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @ApiPropertyOptional({
    description: 'Ringtone ID to play when the alarm goes off (pass null or omit to clear)',
    example: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  })
  @IsOptional()
  @IsUUID()
  ringtoneId?: string;
}

import { IsOptional, IsString, Matches, IsBoolean } from 'class-validator';
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
}

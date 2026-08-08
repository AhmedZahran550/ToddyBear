import { IsNotEmpty, IsString, Matches, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAlarmDto {
  @ApiProperty({
    description: 'Alarm trigger time in 24-hour HH:mm format',
    example: '07:30',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'time must be in HH:mm format (e.g. 07:30 or 17:45)',
  })
  time: string;

  @ApiPropertyOptional({
    description: 'Alarm label or description',
    example: 'Morning Wake Up Alarm',
  })
  @IsOptional()
  @IsString()
  label?: string;
}

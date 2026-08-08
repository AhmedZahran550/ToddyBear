import { IsOptional, IsString, Matches, IsBoolean } from 'class-validator';

export class UpdateAlarmDto {
  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'time must be in HH:mm format',
  })
  time?: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

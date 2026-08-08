import { IsNotEmpty, IsString, Matches, IsOptional } from 'class-validator';

export class CreateAlarmDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'time must be in HH:mm format (e.g. 07:30 or 17:45)',
  })
  time: string;

  @IsOptional()
  @IsString()
  label?: string;
}

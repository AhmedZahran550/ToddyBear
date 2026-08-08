import { IsOptional, IsString, IsIn, IsBoolean } from 'class-validator';

export class UpdateDeviceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(['boy', 'girl'])
  gender?: string;

  @IsOptional()
  @IsString()
  age?: string;

  @IsOptional()
  @IsString()
  ssid?: string;

  @IsOptional()
  @IsString()
  wifiPassword?: string;

  @IsOptional()
  @IsBoolean()
  isOnline?: boolean;
}

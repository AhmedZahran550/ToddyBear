import { IsNotEmpty, IsString, Matches, IsIn, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDeviceDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/, {
    message: 'macAddress must be in format XX:XX:XX:XX:XX:XX',
  })
  @Transform(({ value }) => typeof value === 'string' ? value.toUpperCase().trim() : value)
  macAddress: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsIn(['boy', 'girl'])
  gender: string;

  @IsString()
  @IsNotEmpty()
  age: string;

  @IsOptional()
  @IsString()
  ssid?: string;

  @IsOptional()
  @IsString()
  wifiPassword?: string;
}

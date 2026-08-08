import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class DeviceLoginDto {
  @ApiProperty({
    description: 'Hardware MAC address of the device in format XX:XX:XX:XX:XX:XX',
    example: 'AA:BB:CC:DD:EE:FF',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/, {
    message: 'macAddress must be in format XX:XX:XX:XX:XX:XX',
  })
  @Transform(({ value }) => typeof value === 'string' ? value.toUpperCase().trim() : value)
  macAddress: string;
}

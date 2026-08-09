import { IsNotEmpty, IsString, Matches, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDeviceDto {
  @ApiProperty({
    description: 'Device hardware MAC Address in format XX:XX:XX:XX:XX:XX',
    example: 'AA:BB:CC:DD:EE:FF',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/, {
    message: 'macAddress must be in format XX:XX:XX:XX:XX:XX',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase().trim() : value))
  macAddress: string;

  @ApiProperty({
    description: 'Unique device serial number',
    example: 'TB-9988776655',
  })
  @IsString()
  @IsNotEmpty()
  serialNumber: string;

  @ApiPropertyOptional({
    description: 'Optional name assigned to the device',
    example: 'Teddy Bear',
  })
  @IsOptional()
  @IsString()
  name?: string;
}

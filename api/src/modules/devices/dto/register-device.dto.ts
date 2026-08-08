import { IsNotEmpty, IsString, Matches, IsIn, IsOptional } from 'class-validator';
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
  @Transform(({ value }) => typeof value === 'string' ? value.toUpperCase().trim() : value)
  macAddress: string;

  @ApiProperty({
    description: 'Name assigned to the device / child',
    example: 'Teddy Bear',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Target child gender',
    enum: ['boy', 'girl'],
    example: 'boy',
  })
  @IsIn(['boy', 'girl'])
  gender: string;

  @ApiProperty({
    description: 'Child age',
    example: '4 years',
  })
  @IsString()
  @IsNotEmpty()
  age: string;

  @ApiPropertyOptional({
    description: 'WiFi Network SSID for the device',
    example: 'Home_WiFi',
  })
  @IsOptional()
  @IsString()
  ssid?: string;

  @ApiPropertyOptional({
    description: 'WiFi Password',
    example: 'SecretWiFiPassword123',
  })
  @IsOptional()
  @IsString()
  wifiPassword?: string;
}

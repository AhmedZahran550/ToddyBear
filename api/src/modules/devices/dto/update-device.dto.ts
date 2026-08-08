import { IsOptional, IsString, IsIn, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDeviceDto {
  @ApiPropertyOptional({
    description: 'Updated device name',
    example: 'Teddy Bear',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated child gender',
    enum: ['boy', 'girl'],
    example: 'girl',
  })
  @IsOptional()
  @IsIn(['boy', 'girl'])
  gender?: string;

  @ApiPropertyOptional({
    description: 'Updated child age',
    example: '5 years',
  })
  @IsOptional()
  @IsString()
  age?: string;

  @ApiPropertyOptional({
    description: 'Updated WiFi SSID',
    example: 'New_WiFi_SSID',
  })
  @IsOptional()
  @IsString()
  ssid?: string;

  @ApiPropertyOptional({
    description: 'Updated WiFi password',
    example: 'NewPassword123',
  })
  @IsOptional()
  @IsString()
  wifiPassword?: string;

  @ApiPropertyOptional({
    description: 'Manual online status override',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isOnline?: boolean;
}

import { IsOptional, IsString, IsBoolean } from 'class-validator';
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
    description: 'Updated device serial number',
    example: 'TB-9988776655',
  })
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiPropertyOptional({
    description: 'Manual online status override',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isOnline?: boolean;
}

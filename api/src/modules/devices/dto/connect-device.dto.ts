import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConnectDeviceDto {
  @ApiProperty({
    description: 'Device serial number to connect to user account',
    example: 'TB-9988776655',
  })
  @IsString()
  @IsNotEmpty()
  serialNumber: string;
}

import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PushMessageDto {
  @ApiProperty({
    description: 'Text message to convert to speech and push to the device',
    example: 'Time to brush your teeth!',
  })
  @IsString()
  @IsNotEmpty()
  text: string;
}

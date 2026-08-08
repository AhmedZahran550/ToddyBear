import { IsNotEmpty, IsString } from 'class-validator';

export class PushMessageDto {
  @IsString()
  @IsNotEmpty()
  text: string;
}

import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ChatRole } from '../../../database/entities/chat.entity';

export class CreateChatDto {
  @IsEnum(ChatRole)
  role: ChatRole;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsNotEmpty()
  deviceId: string;
}

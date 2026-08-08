import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateUsageDto {
  @IsInt()
  promptTokens: number;

  @IsInt()
  completionTokens: number;

  @IsInt()
  totalTokens: number;

  @IsString()
  @IsNotEmpty()
  model: string;

  @IsString()
  @IsOptional()
  deviceId?: string;

  @IsString()
  @IsOptional()
  userId?: string;
}

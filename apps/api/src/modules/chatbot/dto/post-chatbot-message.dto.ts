import { IsOptional, IsString, MaxLength } from 'class-validator';

export class PostChatbotMessageDto {
  @IsString()
  @MaxLength(8000)
  text!: string;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  activeModuleCode?: string;
}

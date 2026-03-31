import { IsOptional, IsString } from 'class-validator';

export class MicrosoftCallbackQueryDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  error?: string;

  @IsOptional()
  @IsString()
  error_description?: string;

  /** Envoyé par Entra ID / Microsoft OAuth (ignoré côté métier). */
  @IsOptional()
  @IsString()
  session_state?: string;
}

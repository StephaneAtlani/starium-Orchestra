import { IsOptional, IsString } from 'class-validator';

/**
 * Callback OAuth SSO — query (`response_mode=query`, legacy) ou body form
 * (`response_mode=form_post`, flux recommandé anti Safe Browsing).
 */
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

  /** MSA / Entra form_post — ignoré. */
  @IsOptional()
  @IsString()
  client_info?: string;
}

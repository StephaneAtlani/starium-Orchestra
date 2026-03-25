import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/** Paramètres OAuth Microsoft au niveau plateforme (admin Starium). */
export class UpdatePlatformMicrosoftSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  redirectUri?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  graphScopes?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  oauthSuccessUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  oauthErrorUrl?: string | null;

  @IsOptional()
  @IsInt()
  @Min(30)
  oauthStateTtlSeconds?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  refreshLeewaySeconds?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1000)
  tokenHttpTimeoutMs?: number | null;
}

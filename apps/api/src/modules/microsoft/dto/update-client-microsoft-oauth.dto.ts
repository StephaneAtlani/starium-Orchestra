import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** Identifiants d’application Azure (BYO) pour le client Starium actif. */
export class UpdateClientMicrosoftOAuthDto {
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(200)
  microsoftOAuthClientId?: string | null;

  /** Si omis ou vide, le secret existant est conservé. */
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  microsoftOAuthClientSecret?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  microsoftOAuthAuthorityTenant?: string | null;
}

import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** Aperçu d’un CSV d’évaluations (contenu texte). */
export class PreviewCampaignEvaluationsImportDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5_000_000)
  csvContent!: string;
}

export class ConfirmCampaignEvaluationsImportDto {
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  fingerprint!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5_000_000)
  csvContent!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotencyKey?: string;
}

import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CloseComplianceCampaignDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  closeNote?: string;

  /** Produit un instantané à la clôture (défaut true). */
  @IsOptional()
  @IsBoolean()
  createSnapshot?: boolean;
}

import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateComplianceCampaignDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  frameworkId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  reviewFrequencyMonths?: number;

  /** Ouvre immédiatement la campagne (fige name/version). */
  @IsOptional()
  @IsBoolean()
  openImmediately?: boolean;

  /** Crée un instantané initial (utile avec openImmediately). */
  @IsOptional()
  @IsBoolean()
  createSnapshot?: boolean;
}

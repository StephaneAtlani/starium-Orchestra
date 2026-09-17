import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ComplianceCampaignModality } from '@prisma/client';

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

  /** Clés de domaine (`category`) à inclure dans la revue. */
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  scopeDomainKeys?: string[];

  @IsOptional()
  @IsEnum(ComplianceCampaignModality)
  modality?: ComplianceCampaignModality;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  ownerUserId?: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string;
}

import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * RFC-STRAT-007 — modification limitée d'un lien stratégique.
 * Pas de mutation de `linkType`/`targetType` ni de `targetId` (re-création requise).
 */
export class UpdateStrategicLinkDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  targetLabelSnapshot?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  alignmentScore?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}

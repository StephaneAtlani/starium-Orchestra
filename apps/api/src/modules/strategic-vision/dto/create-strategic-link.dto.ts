import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { StrategicLinkType } from '@prisma/client';

/**
 * RFC-STRAT-007 — `targetType` est l'alias applicatif de `linkType`.
 * Un seul des deux est requis ; ils sont fusionnés côté service.
 * `StrategicLinkType` reste l'enum Prisma source unique.
 */
export class CreateStrategicLinkDto {
  @IsOptional()
  @IsEnum(StrategicLinkType)
  linkType?: StrategicLinkType;

  @IsOptional()
  @IsEnum(StrategicLinkType)
  targetType?: StrategicLinkType;

  @IsOptional()
  @IsString()
  @MinLength(1)
  targetId?: string;

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

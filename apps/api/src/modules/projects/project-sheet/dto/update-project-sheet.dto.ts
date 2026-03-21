import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ProjectCopilRecommendation, ProjectRiskLevel } from '@prisma/client';
import { TowsActionsPatchDto } from './tows-actions.dto';

/** Trim + retire les entrées vides ; [] reste []. */
function trimStringArray() {
  return Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    if (!Array.isArray(value)) return value;
    return value
      .map((s: unknown) => (typeof s === 'string' ? s.trim() : ''))
      .filter((s: string) => s.length > 0);
  });
}

function trimOptionalString() {
  return Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value !== 'string') return value;
    const t = value.trim();
    return t.length ? t : undefined;
  });
}

export class UpdateProjectSheetDto {
  /** Nom du projet (cadrage « Quoi ») */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(255)
  name?: string;

  /** Cadrage OQQCQPC — null efface */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(500)
  cadreLocation?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(500)
  cadreQui?: string | null;

  /** Équipes / directions impliquées (texte libre) — null efface */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(2000)
  involvedTeams?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsDateString()
  startDate?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsDateString()
  targetEndDate?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  businessValueScore?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  strategicAlignment?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  urgencyScore?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  estimatedCost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  estimatedGain?: number;

  @IsOptional()
  @IsEnum(ProjectRiskLevel)
  riskLevel?: ProjectRiskLevel;

  /** Réponse au risque (mitigation, plan d’action) — null efface */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(20000)
  riskResponse?: string | null;

  /** Recommandation COPIL / COPRO (saisie humaine, non dérivée des indicateurs). */
  @IsOptional()
  @IsEnum(ProjectCopilRecommendation)
  copilRecommendation?: ProjectCopilRecommendation;

  /** Description courte du projet (champ `Project.description`) */
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value !== 'string') return value;
    return value.trim();
  })
  @IsString()
  @MaxLength(50000)
  description?: string;

  @IsOptional()
  @trimOptionalString()
  @IsString()
  @MaxLength(20000)
  businessProblem?: string;

  @IsOptional()
  @trimOptionalString()
  @IsString()
  @MaxLength(20000)
  businessBenefits?: string;

  /** Liste de KPI (lignes) — [] efface ; non fourni = inchangé */
  @IsOptional()
  @trimStringArray()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MaxLength(5000, { each: true })
  businessSuccessKpis?: string[];

  @IsOptional()
  @trimStringArray()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MaxLength(5000, { each: true })
  swotStrengths?: string[];

  @IsOptional()
  @trimStringArray()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MaxLength(5000, { each: true })
  swotWeaknesses?: string[];

  @IsOptional()
  @trimStringArray()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MaxLength(5000, { each: true })
  swotOpportunities?: string[];

  @IsOptional()
  @trimStringArray()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MaxLength(5000, { each: true })
  swotThreats?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => TowsActionsPatchDto)
  towsActions?: TowsActionsPatchDto;
}

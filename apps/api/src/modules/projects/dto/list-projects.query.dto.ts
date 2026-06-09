import { Type, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import {
  ProjectCriticality,
  ProjectPriority,
  ProjectStatus,
} from '@prisma/client';
import { RESOURCE_ACL_CUID_REGEX } from '../../access-control/resource-acl.constants';

function parseBooleanQuery(value: unknown): boolean | undefined {
  if (value === true || value === 'true' || value === '1' || value === 1) {
    return true;
  }
  if (value === false || value === 'false' || value === '0' || value === 0) {
    return false;
  }
  return undefined;
}

function parseTagIdsQuery(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parts = String(value)
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  if (parts.length === 0) return undefined;
  return Array.from(new Set(parts));
}

export class ListProjectsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
  @IsEnum(ProjectPriority)
  priority?: ProjectPriority;

  @IsOptional()
  @IsEnum(ProjectCriticality)
  criticality?: ProjectCriticality;

  @IsOptional()
  @IsIn(['PROJECT', 'ACTIVITY'])
  kind?: 'PROJECT' | 'ACTIVITY';

  @IsOptional()
  @IsString()
  @IsIn([
    'name',
    'targetEndDate',
    'status',
    'priority',
    'criticality',
    'computedHealth',
    'progressPercent',
    'owner',
  ])
  sortBy?: string = 'targetEndDate';

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'asc';

  @IsOptional()
  @Transform(({ value }) => parseBooleanQuery(value))
  @IsBoolean()
  atRiskOnly?: boolean;

  /** Projets dont la date cible est dépassée (signal `isLate`). */
  @IsOptional()
  @Transform(({ value }) => parseBooleanQuery(value))
  @IsBoolean()
  lateOnly?: boolean;

  @IsOptional()
  @Transform(({ value }) => parseBooleanQuery(value))
  @IsBoolean()
  myProjectsOnly?: boolean;

  @IsOptional()
  @IsIn(['GREEN', 'ORANGE', 'RED'])
  computedHealth?: 'GREEN' | 'ORANGE' | 'RED';

  @IsOptional()
  @IsString()
  @MinLength(1)
  myRole?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  portfolioCategoryId?: string;

  /** Filtre par chef de projet (utilisateur client). */
  @IsOptional()
  @IsString()
  @MinLength(1)
  ownerUserId?: string;

  /** RFC-ORG-003 — filtre sur `Project.ownerOrgUnitId` (colonne stockée). */
  @IsOptional()
  @IsString()
  @MinLength(1)
  ownerOrgUnitId?: string;

  /** RFC-PROJ-017 — filtre par étiquettes portefeuille (`tagIds=id1,id2`). */
  @IsOptional()
  @Transform(({ value }) => parseTagIdsQuery(value))
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @Matches(RESOURCE_ACL_CUID_REGEX, {
    each: true,
    message: 'each value in tagIds must be a valid CUID',
  })
  tagIds?: string[];

  /**
   * Mode de combinaison des étiquettes : `any` = OU (défaut), `all` = ET.
   * Ignoré si un seul `tagIds` ou si `tagIds` absent.
   */
  @IsOptional()
  @IsIn(['any', 'all'])
  tagIdsMatch?: 'any' | 'all';
}

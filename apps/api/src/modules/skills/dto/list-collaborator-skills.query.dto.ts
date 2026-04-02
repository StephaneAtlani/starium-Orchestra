import { Transform } from 'class-transformer';
import {
  CollaboratorSkillSource,
  SkillReferenceLevel,
} from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

function parseStringArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const raw = Array.isArray(value) ? value : [value];
  const parts = raw
    .flatMap((entry) =>
      String(entry)
        .split(',')
        .map((item) => item.trim()),
    )
    .filter((item) => item.length > 0);
  return Array.from(new Set(parts));
}

function parseBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const normalized = String(value).toLowerCase();
  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;
  return undefined;
}

export enum CollaboratorSkillListSortBy {
  SKILL_NAME = 'skillName',
  LEVEL = 'level',
  REVIEWED_AT = 'reviewedAt',
  VALIDATED_AT = 'validatedAt',
  CREATED_AT = 'createdAt',
}

export enum CollaboratorSkillSortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class ListCollaboratorSkillsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @Transform(({ value }) => parseStringArray(value))
  @IsEnum(SkillReferenceLevel, { each: true })
  level?: SkillReferenceLevel[];

  @IsOptional()
  @Transform(({ value }) => parseStringArray(value))
  @IsEnum(CollaboratorSkillSource, { each: true })
  source?: CollaboratorSkillSource[];

  /** true = validatedAt et validatedByUserId tous deux non null ; false = sinon */
  @IsOptional()
  @Transform(({ value }) => parseBoolean(value))
  validated?: boolean;

  @IsOptional()
  @Transform(({ value }) => parseBoolean(value))
  includeArchived?: boolean;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(CollaboratorSkillListSortBy)
  sortBy?: CollaboratorSkillListSortBy = CollaboratorSkillListSortBy.CREATED_AT;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase() : value,
  )
  @IsEnum(CollaboratorSkillSortOrder)
  sortOrder?: CollaboratorSkillSortOrder = CollaboratorSkillSortOrder.DESC;
}

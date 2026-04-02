import { Transform } from 'class-transformer';
import { SkillReferenceLevel } from '@prisma/client';
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

export enum SkillCollaboratorsListSortBy {
  COLLABORATOR_NAME = 'collaboratorName',
  LEVEL = 'level',
  VALIDATED_AT = 'validatedAt',
}

export enum SkillCollaboratorsSortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class ListSkillCollaboratorsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @Transform(({ value }) => parseStringArray(value))
  @IsEnum(SkillReferenceLevel, { each: true })
  level?: SkillReferenceLevel[];

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
  @IsEnum(SkillCollaboratorsListSortBy)
  sortBy?: SkillCollaboratorsListSortBy =
    SkillCollaboratorsListSortBy.COLLABORATOR_NAME;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase() : value,
  )
  @IsEnum(SkillCollaboratorsSortOrder)
  sortOrder?: SkillCollaboratorsSortOrder = SkillCollaboratorsSortOrder.ASC;
}

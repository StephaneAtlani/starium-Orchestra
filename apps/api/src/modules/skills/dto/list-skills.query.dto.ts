import { Transform } from 'class-transformer';
import { SkillReferenceLevel, SkillStatus } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

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

export enum SkillSortBy {
  NAME = 'name',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  REFERENCE_LEVEL = 'referenceLevel',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class ListSkillsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @Transform(({ value }) => parseStringArray(value))
  @IsEnum(SkillStatus, { each: true })
  status?: SkillStatus[];

  @IsOptional()
  @Transform(({ value }) => parseStringArray(value))
  @IsEnum(SkillReferenceLevel, { each: true })
  referenceLevel?: SkillReferenceLevel[];

  @IsOptional()
  @Transform(({ value }) => parseBoolean(value))
  includeArchived?: boolean = false;

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
  @IsEnum(SkillSortBy)
  sortBy?: SkillSortBy = SkillSortBy.NAME;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.ASC;
}

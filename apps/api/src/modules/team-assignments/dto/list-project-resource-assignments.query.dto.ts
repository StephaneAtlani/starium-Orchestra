import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

function parseBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const normalized = String(value).toLowerCase();
  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;
  return undefined;
}

/** ISO 8601 date part YYYY-MM-DD */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * RFC-TEAM-008 — liste projet-scopée : mêmes filtres que TEAM-007 sauf `projectId`
 * (imposé par le path).
 */
export class ListProjectResourceAssignmentsQueryDto {
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsUUID()
  collaboratorId?: string;

  /**
   * Optionnel — si fourni, doit être identique au `:projectId` du path (sinon 400).
   * N’alimente pas le filtre : le path impose le projet.
   */
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsUUID()
  activityTypeId?: string;

  @IsOptional()
  @Transform(({ value }) => parseBoolean(value))
  @IsBoolean()
  includeCancelled?: boolean = false;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  @Matches(ISO_DATE, { message: 'from must be ISO date YYYY-MM-DD' })
  from?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  @Matches(ISO_DATE, { message: 'to must be ISO date YYYY-MM-DD' })
  to?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  @Matches(ISO_DATE, { message: 'activeOn must be ISO date YYYY-MM-DD' })
  activeOn?: string;
}

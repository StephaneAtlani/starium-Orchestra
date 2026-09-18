import { Type, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ProcedureCategory, ProcedureStatus } from '@prisma/client';

export class ListProceduresQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @IsEnum(ProcedureStatus)
  status?: ProcedureStatus;

  @IsOptional()
  @IsEnum(ProcedureCategory)
  category?: ProcedureCategory;

  @IsOptional()
  @IsString()
  q?: string;

  /** Si true, inclut les procédures ARCHIVED (défaut : masquées). */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  includeArchived?: boolean;
}

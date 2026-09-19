import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ProcedureStatus, ProcedureVersionBumpType } from '@prisma/client';

/** Cibles autorisées via POST …/transition (pas ARCHIVED). */
export enum ProcedureTransitionTarget {
  DRAFT = 'DRAFT',
  IN_REVIEW = 'IN_REVIEW',
  PUBLISHED = 'PUBLISHED',
}

export class TransitionProcedureDto {
  @IsEnum(ProcedureTransitionTarget)
  to!: ProcedureTransitionTarget;

  /** Mineure (défaut) ou Majeure — ignoré / forcé à la 1ʳᵉ publish (v1.0). */
  @IsOptional()
  @IsEnum(ProcedureVersionBumpType)
  bumpType?: ProcedureVersionBumpType;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  changeSummary?: string;

  @IsOptional()
  @IsISO8601()
  expectedUpdatedAt?: string;
}

export type ProcedureTransitionStatus = Extract<
  ProcedureStatus,
  'DRAFT' | 'IN_REVIEW' | 'PUBLISHED'
>;

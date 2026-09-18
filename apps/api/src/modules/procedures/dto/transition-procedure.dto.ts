import { IsEnum, IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';
import { ProcedureStatus } from '@prisma/client';

/** Cibles autorisées via POST …/transition (pas ARCHIVED). */
export enum ProcedureTransitionTarget {
  DRAFT = 'DRAFT',
  IN_REVIEW = 'IN_REVIEW',
  PUBLISHED = 'PUBLISHED',
}

export class TransitionProcedureDto {
  @IsEnum(ProcedureTransitionTarget)
  to!: ProcedureTransitionTarget;

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

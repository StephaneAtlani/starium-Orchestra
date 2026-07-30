import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  IsNumberString,
} from 'class-validator';
import { BudgetStatus, BudgetTaxMode } from '@prisma/client';
import {
  VISUAL_ACCENT_TOKENS,
  VISUAL_ICON_KEYS,
  VISUAL_SURFACE_TOKENS,
  type VisualAccentToken,
  type VisualIconKey,
  type VisualSurfaceToken,
} from '@starium-orchestra/types';

export class UpdateBudgetDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @IsOptional()
  @IsEnum(BudgetStatus)
  status?: BudgetStatus;

  @IsOptional()
  @IsString()
  ownerUserId?: string;

  /** RFC-ORG-003 — unité propriétaire (nullable). */
  @IsOptional()
  @IsString()
  ownerOrgUnitId?: string | null;

  @IsOptional()
  @IsEnum(BudgetTaxMode)
  taxMode?: BudgetTaxMode;

  @IsOptional()
  @IsNumberString()
  defaultTaxRate?: string;

  /** Commentaire optionnel lors d’un changement de statut — stocké dans l’audit `budget.status.changed` (non persisté sur le budget). */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  statusChangeComment?: string;

  /**
   * Obligatoire quand le passage de statut du budget impose une cascade sur les enveloppes/lignes
   * (Brouillon→Soumis ou Soumis|Révisé→Validé) et qu’il existe encore des enveloppes/lignes à faire évoluer.
   */
  @IsOptional()
  @IsBoolean()
  cascadeChildWorkflowStatuses?: boolean;

  /** RFC-DS-001 — dérogation visuelle locale (prioritaire sur ownerOrgUnit). */
  @IsOptional()
  @IsIn(VISUAL_ICON_KEYS)
  iconKey?: VisualIconKey | null;

  @IsOptional()
  @IsIn(VISUAL_ACCENT_TOKENS)
  accentToken?: VisualAccentToken | null;

  @IsOptional()
  @IsIn(VISUAL_SURFACE_TOKENS)
  surfaceToken?: VisualSurfaceToken | null;
}

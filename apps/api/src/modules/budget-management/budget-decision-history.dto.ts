import { Transform, Type } from 'class-transformer';
import { IsArray, IsDate, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListBudgetDecisionHistoryQueryDto {
  @IsOptional()
  @IsString()
  envelopeId?: string;

  @IsOptional()
  @IsString()
  budgetLineId?: string;

  /** Sous-ensemble des actions whitelistées ; filtré côté service sur `BUDGET_DECISION_HISTORY_ACTIONS`. */
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return [value];
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  actions?: string[];

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export type DecisionHistoryActorDto = {
  id: string;
  displayName: string;
};

export type DecisionHistoryContextDto = {
  budget: { id: string; name: string; code: string | null };
  envelope?: { id: string; name: string; code: string } | null;
  line?: { id: string; name: string; code: string } | null;
};

export type DecisionHistoryItemDto = {
  id: string;
  createdAt: string;
  action: string;
  summary: string;
  /** Commentaire saisi lors du changement de statut (audits `*.status.changed`). */
  statusChangeComment: string | null;
  actor: DecisionHistoryActorDto | null;
  resourceType: string;
  resourceId: string | null;
  context: DecisionHistoryContextDto;
  details: Record<string, unknown> | null;
};

export type ListBudgetDecisionHistoryResponseDto = {
  items: DecisionHistoryItemDto[];
  total: number;
  limit: number;
  offset: number;
};

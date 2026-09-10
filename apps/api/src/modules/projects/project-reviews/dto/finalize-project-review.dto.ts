import { IsBoolean, IsOptional } from 'class-validator';

/** RFC-PROJ-013-8 — body optionnel de finalisation (side-effects opt-in). */
export class FinalizeProjectReviewDto {
  @IsOptional()
  @IsBoolean()
  pushActionsToTasks?: boolean;

  @IsOptional()
  @IsBoolean()
  promoteRiskNotes?: boolean;
}

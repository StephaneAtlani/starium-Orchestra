import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { SelectScenarioSyncOptionsDto } from './select-scenario-sync.dto';

export const SCENARIO_SELECTION_TARGET_PROJECT_STATUSES = [
  'PLANNED',
  'IN_PROGRESS',
] as const;

export type ScenarioSelectionTargetProjectStatus =
  (typeof SCENARIO_SELECTION_TARGET_PROJECT_STATUSES)[number];

export class SelectProjectScenarioDto extends SelectScenarioSyncOptionsDto {
  @IsIn(SCENARIO_SELECTION_TARGET_PROJECT_STATUSES)
  targetProjectStatus!: ScenarioSelectionTargetProjectStatus;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  })
  @IsString()
  @MaxLength(2000)
  decisionNote?: string | null;

  @IsOptional()
  @IsBoolean()
  archiveOtherScenarios?: boolean;
}

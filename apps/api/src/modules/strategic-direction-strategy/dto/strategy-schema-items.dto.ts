import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export const STRATEGIC_DIRECTION_ACCENT_TONES = [
  'info',
  'gold',
  'purple',
  'teal',
  'success',
  'danger',
] as const;

export type StrategicDirectionAccentTone = (typeof STRATEGIC_DIRECTION_ACCENT_TONES)[number];

export class StrategyOwnAxisDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  id!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsIn([...STRATEGIC_DIRECTION_ACCENT_TONES])
  tone?: StrategicDirectionAccentTone;
}

export class StrategyMilestoneDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  monthOffset!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  label!: string;
}

export class StrategyInitiativeDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  id?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  ownerLabel?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  budgetCents?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  progressPct!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  lane!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  startMonthOffset!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  endMonthOffset!: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(40)
  strategicAxisIds?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StrategyMilestoneDto)
  @ArrayMaxSize(40)
  milestones?: StrategyMilestoneDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(40)
  linkedProjectNames?: string[];
}

export class StrategyOutcomeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  ownerLabel?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  target!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  current?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  unit?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  progressPct!: number;
}

export class StrategyKpiDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  label!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  value!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  detail?: string;

  @IsOptional()
  @IsBoolean()
  linkedFromOutcome?: boolean;
}

export class StrategyRiskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  probability?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  impact?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  ownerLabel?: string;

  @IsOptional()
  @IsIn(['danger', 'warning', 'info'])
  level?: 'danger' | 'warning' | 'info';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  mitigation?: string;
}

export class StrategyContentBlockDto {
  @IsIn(['text', 'image', 'document'])
  kind!: 'text' | 'image' | 'document';

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  body?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  documentId?: string;
}

export class StrategyPriorityDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  StrategyContentBlockDto,
  StrategyInitiativeDto,
  StrategyKpiDto,
  StrategyOutcomeDto,
  StrategyOwnAxisDto,
  StrategyPriorityDto,
  StrategyRiskDto,
} from './strategy-schema-items.dto';

export class UpdateStrategicDirectionStrategyDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  archiveReason?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  ambition?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  context?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  statement?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  horizonLabel?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  horizonStartYear?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  horizonYearCount?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  ownerLabel?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  alignedVisionId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StrategyPriorityDto)
  @ArrayMaxSize(40)
  strategicPriorities?: StrategyPriorityDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StrategyOutcomeDto)
  @ArrayMaxSize(40)
  expectedOutcomes?: StrategyOutcomeDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StrategyKpiDto)
  @ArrayMaxSize(40)
  kpis?: StrategyKpiDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StrategyInitiativeDto)
  @ArrayMaxSize(80)
  majorInitiatives?: StrategyInitiativeDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StrategyRiskDto)
  @ArrayMaxSize(40)
  risks?: StrategyRiskDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StrategyOwnAxisDto)
  @ArrayMaxSize(20)
  ownAxes?: StrategyOwnAxisDto[];

  @IsOptional()
  @IsObject()
  budgetsByYear?: Record<string, number>;

  @IsOptional()
  @IsObject()
  axisContributions?: Record<string, number>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StrategyContentBlockDto)
  @ArrayMaxSize(40)
  contentBlocks?: StrategyContentBlockDto[];
}

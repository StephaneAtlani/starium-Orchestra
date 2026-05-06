import { IsArray, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

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
  strategicPriorities?: Array<Record<string, unknown>>;

  @IsOptional()
  @IsArray()
  expectedOutcomes?: Array<Record<string, unknown>>;

  @IsOptional()
  @IsArray()
  kpis?: Array<Record<string, unknown>>;

  @IsOptional()
  @IsArray()
  majorInitiatives?: Array<Record<string, unknown>>;

  @IsOptional()
  @IsArray()
  risks?: Array<Record<string, unknown>>;
}

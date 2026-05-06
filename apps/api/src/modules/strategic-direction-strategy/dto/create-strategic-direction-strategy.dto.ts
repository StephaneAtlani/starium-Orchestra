import { IsArray, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateStrategicDirectionStrategyDto {
  @IsString()
  @IsNotEmpty()
  directionId!: string;

  @IsString()
  @IsNotEmpty()
  alignedVisionId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  horizonLabel!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  ambition!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  context!: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  statement?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  ownerLabel?: string;

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

import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateProjectScenarioRiskDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  riskTypeId?: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  probability!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  impact!: number;

  @IsOptional()
  @IsString()
  mitigationPlan?: string;

  @IsOptional()
  @IsString()
  ownerLabel?: string;
}

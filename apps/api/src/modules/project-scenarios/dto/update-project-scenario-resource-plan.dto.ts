import { Type } from 'class-transformer';
import {
  IsDate,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateProjectScenarioResourcePlanDto {
  @IsOptional()
  @IsString()
  resourceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  roleLabel?: string | null;

  @IsOptional()
  @IsNumberString()
  allocationPct?: string | null;

  @IsOptional()
  @IsNumberString()
  plannedDays?: string | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date | null;

  @IsOptional()
  @IsString()
  @MinLength(1)
  notes?: string | null;
}

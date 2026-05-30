import {
  GovernanceCycleCadence,
  GovernanceCycleStatus,
} from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateGovernanceCycleDto {
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
  @MaxLength(8000)
  description?: string;

  @IsOptional()
  @IsEnum(GovernanceCycleCadence)
  cadence?: GovernanceCycleCadence;

  @IsOptional()
  @IsEnum(GovernanceCycleStatus)
  status?: GovernanceCycleStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @IsOptional()
  @IsDateString()
  endDate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  sponsorLabel?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  objectiveSummary?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  decisionSummary?: string | null;
}

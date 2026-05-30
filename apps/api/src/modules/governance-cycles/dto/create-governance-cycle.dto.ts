import {
  GovernanceCycleCadence,
  GovernanceCycleStatus,
} from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateGovernanceCycleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  description?: string;

  @IsEnum(GovernanceCycleCadence)
  cadence!: GovernanceCycleCadence;

  @IsOptional()
  @IsEnum(GovernanceCycleStatus)
  status?: GovernanceCycleStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  sponsorLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  objectiveSummary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  decisionSummary?: string;
}

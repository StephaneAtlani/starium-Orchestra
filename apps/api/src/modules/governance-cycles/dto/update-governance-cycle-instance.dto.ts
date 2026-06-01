import { GovernanceCycleInstanceMode } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateGovernanceCycleInstanceDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  periodLabel?: string;

  @IsOptional()
  @IsDateString()
  periodStartDate?: string | null;

  @IsOptional()
  @IsDateString()
  periodEndDate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  label?: string | null;

  @IsOptional()
  @IsDateString()
  scheduledDecisionAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string | null;

  @IsOptional()
  @IsEnum(GovernanceCycleInstanceMode)
  mode?: GovernanceCycleInstanceMode;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  locationLabel?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  meetingUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  decisionSummary?: string | null;
}

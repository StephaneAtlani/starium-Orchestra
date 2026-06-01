import { GovernanceCycleInstanceMode } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateGovernanceCycleInstanceDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  periodLabel?: string;

  @IsOptional()
  @IsDateString()
  periodStartDate?: string;

  @IsOptional()
  @IsDateString()
  periodEndDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  label?: string;

  @IsOptional()
  @IsDateString()
  scheduledDecisionAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsEnum(GovernanceCycleInstanceMode)
  mode?: GovernanceCycleInstanceMode;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  locationLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  meetingUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  decisionSummary?: string;

  @IsOptional()
  @IsBoolean()
  prefillAgendaFromCycle?: boolean;
}

import { ProjectRequestInstructionOpinion } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class ProjectRequestN1DecideDto {
  @IsIn(['APPROVE', 'REJECT'])
  outcome!: 'APPROVE' | 'REJECT';

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  comment?: string;
}

export class ProjectRequestInstructDto {
  @IsEnum(ProjectRequestInstructionOpinion)
  opinion!: ProjectRequestInstructionOpinion;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  retainedBudget?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  retainedEffortDays?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  summary?: string;
}

export class ProjectRequestAgendaDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  meetingLabel!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  meetingRef?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  agendaItemId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  pointType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(120)
  durationMinutes?: number;
}

export class ProjectRequestCommitteeDecideDto {
  @IsIn(['APPROVE', 'POSTPONE', 'REJECT'])
  outcome!: 'APPROVE' | 'POSTPONE' | 'REJECT';

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  motivation?: string;
}

export class PreviewCircuitQueryDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  budget?: number;
}

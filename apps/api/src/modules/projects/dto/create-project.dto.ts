import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  ProjectCriticality,
  ProjectPriority,
  ProjectStatus,
  ProjectTeamMemberAffiliation,
  ProjectType,
} from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateProjectDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  code!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(['PROJECT', 'ACTIVITY'])
  kind?: 'PROJECT' | 'ACTIVITY';

  @IsEnum(ProjectType)
  type!: ProjectType;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsEnum(ProjectPriority)
  priority!: ProjectPriority;

  @IsOptional()
  @IsString()
  sponsorUserId?: string;

  @IsOptional()
  @IsString()
  ownerUserId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  portfolioCategoryId?: string | null;

  /** Responsable nom libre (ressource « personne » déjà vue en équipe projet). Exclu si `ownerUserId`. */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  ownerFreeLabel?: string;

  @IsOptional()
  @IsEnum(ProjectTeamMemberAffiliation)
  ownerAffiliation?: ProjectTeamMemberAffiliation;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  targetEndDate?: string;

  @IsOptional()
  @IsDateString()
  actualEndDate?: string;

  @IsEnum(ProjectCriticality)
  criticality!: ProjectCriticality;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  progressPercent?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  targetBudgetAmount?: number;

  @IsOptional()
  @IsString()
  pilotNotes?: string;
}

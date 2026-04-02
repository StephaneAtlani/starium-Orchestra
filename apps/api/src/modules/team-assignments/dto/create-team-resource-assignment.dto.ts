import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTeamResourceAssignmentDto {
  @IsUUID()
  collaboratorId!: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsUUID()
  activityTypeId!: string;

  @IsOptional()
  @IsUUID()
  projectTeamRoleId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  roleLabel!: string;

  /** ISO 8601 date-time (stored as DateTime). */
  @IsString()
  @IsNotEmpty()
  startDate!: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100)
  allocationPercent!: number;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;
}

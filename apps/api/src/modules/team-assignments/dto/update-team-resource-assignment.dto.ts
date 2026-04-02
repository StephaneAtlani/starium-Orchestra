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
  ValidateIf,
} from 'class-validator';

export class UpdateTeamResourceAssignmentDto {
  @IsOptional()
  @IsUUID()
  collaboratorId?: string;

  /** Omit for no change; `null` clears project (hors projet). */
  @IsOptional()
  @ValidateIf((_, o: UpdateTeamResourceAssignmentDto) => o.projectId !== null)
  @IsUUID()
  projectId?: string | null;

  @IsOptional()
  @IsUUID()
  activityTypeId?: string;

  @IsOptional()
  @ValidateIf(
    (_, o: UpdateTeamResourceAssignmentDto) => o.projectTeamRoleId !== null,
  )
  @IsUUID()
  projectTeamRoleId?: string | null;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  roleLabel?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100)
  allocationPercent?: number;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;
}

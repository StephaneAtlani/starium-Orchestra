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

/** RFC-TEAM-008 — mise à jour projet-scopée ; pas de projectId (rattaché au path). */
export class UpdateProjectResourceAssignmentDto {
  @IsOptional()
  @IsUUID()
  collaboratorId?: string;

  @IsOptional()
  @IsUUID()
  activityTypeId?: string;

  @IsOptional()
  @ValidateIf(
    (_, o: UpdateProjectResourceAssignmentDto) => o.projectTeamRoleId !== null,
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

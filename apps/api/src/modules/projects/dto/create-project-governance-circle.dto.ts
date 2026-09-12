import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProjectTeamColorToken } from '@prisma/client';

export class ProjectTeamMemberInputDto {
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  identityKey!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  userId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  companyName?: string | null;

  /** E-mail externe pour convocations (sans compte). */
  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsEmail()
  @MaxLength(320)
  email?: string | null;

  /** Fiche Resource HUMAN (renseigné / recalculé côté serveur pour les externes). */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  resourceId?: string | null;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class CreateProjectTeamDto {
  @IsString()
  @MinLength(2)
  @MaxLength(24)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string;

  @IsOptional()
  @IsEnum(ProjectTeamColorToken)
  colorToken?: ProjectTeamColorToken;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  pilotIdentityKey?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ProjectTeamMemberInputDto)
  members?: ProjectTeamMemberInputDto[];

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateProjectTeamDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(24)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string | null;

  @IsOptional()
  @IsEnum(ProjectTeamColorToken)
  colorToken?: ProjectTeamColorToken;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  pilotIdentityKey?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ProjectTeamMemberInputDto)
  members?: ProjectTeamMemberInputDto[];

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

/** @deprecated Use CreateProjectTeamDto — kept for alias governance-circles. */
export class CreateProjectGovernanceCircleDto extends CreateProjectTeamDto {}

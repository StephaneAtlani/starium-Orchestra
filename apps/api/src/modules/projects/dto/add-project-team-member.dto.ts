import { ProjectTeamMemberAffiliation } from '@prisma/client';
import { Allow, ArrayUnique, IsArray, IsEnum, IsOptional, IsString } from 'class-validator';

/** Soit un `userId` (compte client actif), soit `freeLabel` + `affiliation` (nom libre). */
export class AddProjectTeamMemberDto {
  @IsString()
  roleId!: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  freeLabel?: string;

  @IsOptional()
  @IsEnum(ProjectTeamMemberAffiliation)
  affiliation?: ProjectTeamMemberAffiliation;

  /** Cercles de gouvernance du projet (ids) — une ressource peut en cumuler plusieurs. */
  @Allow()
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  circleIds?: string[];
}

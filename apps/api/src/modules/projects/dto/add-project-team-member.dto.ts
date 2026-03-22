import { ProjectTeamMemberAffiliation } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

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
}

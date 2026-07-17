import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ProjectMicrosoftTeamsProvisioningResolutionType } from '@prisma/client';

export class ResolveProjectMicrosoftTeamsProvisioningDto {
  @IsEnum(ProjectMicrosoftTeamsProvisioningResolutionType)
  resolutionType!: ProjectMicrosoftTeamsProvisioningResolutionType;

  @IsOptional()
  @IsString()
  teamId?: string;
}

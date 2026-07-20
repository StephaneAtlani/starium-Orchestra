import { Equals, IsBoolean, IsEnum, IsOptional, IsString, ValidateIf } from 'class-validator';
import { ProjectMicrosoftTeamsProvisioningResolutionType } from '@prisma/client';

export class ResolveProjectMicrosoftTeamsProvisioningDto {
  @IsEnum(ProjectMicrosoftTeamsProvisioningResolutionType)
  resolutionType!: ProjectMicrosoftTeamsProvisioningResolutionType;

  @ValidateIf(
    (o: ResolveProjectMicrosoftTeamsProvisioningDto) =>
      o.resolutionType ===
      ProjectMicrosoftTeamsProvisioningResolutionType.CONFIRMED_NOT_CREATED,
  )
  @IsBoolean()
  @Equals(true, {
    message: 'confirmation doit être true pour CONFIRMED_NOT_CREATED',
  })
  confirmation?: boolean;

  @IsOptional()
  @IsString()
  teamId?: string;
}

import { ProjectRaciKind } from '@prisma/client';
import { IsBoolean, IsEnum, IsString } from 'class-validator';

export class UpdateProjectTeamRaciDto {
  @IsString()
  roleId!: string;

  @IsEnum(ProjectRaciKind)
  kind!: ProjectRaciKind;

  @IsBoolean()
  enabled!: boolean;
}

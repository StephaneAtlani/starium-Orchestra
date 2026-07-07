import { ProjectRaciKind } from '@prisma/client';
import { IsEnum, IsOptional, IsString, ValidateIf } from 'class-validator';

export class UpdateProjectTeamRaciDto {
  @IsString()
  actionId!: string;

  @IsString()
  roleId!: string;

  /** `null` ou absent après validation métier = effacer la cellule. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsEnum(ProjectRaciKind)
  kind?: ProjectRaciKind | null;
}

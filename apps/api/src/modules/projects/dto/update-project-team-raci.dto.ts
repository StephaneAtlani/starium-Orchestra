import { ProjectRaciKind } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';

export class UpdateProjectTeamRaciDto {
  @IsString()
  actionId!: string;

  /** RFC-PROJ-023 R1 — acteur personne. */
  @IsString()
  @MinLength(1)
  identityKey!: string;

  /** Legacy optionnel (ignoré si identityKey présent). */
  @IsOptional()
  @IsString()
  roleId?: string;

  /** `null` ou absent après validation métier = effacer la cellule. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsEnum(ProjectRaciKind)
  kind?: ProjectRaciKind | null;
}

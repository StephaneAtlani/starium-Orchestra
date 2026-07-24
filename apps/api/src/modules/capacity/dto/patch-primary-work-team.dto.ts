import { IsOptional, IsString, ValidateIf } from 'class-validator';

export class PatchPrimaryWorkTeamDto {
  /** null = retirer la WorkTeam principale. */
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  primaryCapacityWorkTeamId?: string | null;
}

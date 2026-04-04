import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateWorkTeamDto {
  @IsString()
  @MaxLength(500)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  code?: string | null;

  @IsOptional()
  @IsString()
  parentId?: string | null;

  /** Responsable d’équipe — Resource `type = HUMAN` (obligatoire pour toute équipe active à la création). */
  @IsString()
  @IsNotEmpty()
  leadResourceId!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

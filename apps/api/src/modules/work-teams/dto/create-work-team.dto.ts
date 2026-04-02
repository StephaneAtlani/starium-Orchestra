import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

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

  @IsOptional()
  @IsString()
  leadCollaboratorId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

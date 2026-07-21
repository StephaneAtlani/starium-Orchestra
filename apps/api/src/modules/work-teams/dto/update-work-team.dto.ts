import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateWorkTeamDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  code?: string | null;

  @IsOptional()
  @IsString()
  parentId?: string | null;

  /** Direction stratégique de rattachement (`null` = détacher). */
  @IsOptional()
  @IsString()
  strategicDirectionId?: string | null;

  @IsOptional()
  @IsString()
  leadResourceId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

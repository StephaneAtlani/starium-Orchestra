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

  /** Direction / unité organisationnelle de rattachement (`null` = détacher). */
  @IsOptional()
  @IsString()
  orgUnitId?: string | null;

  @IsOptional()
  @IsString()
  leadResourceId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

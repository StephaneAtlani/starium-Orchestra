import { Transform } from 'class-transformer';
import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCollaboratorDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  firstName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  lastName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  displayName?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @MaxLength(190)
  email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(190)
  username?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  jobTitle?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  department?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(190)
  managerId?: string | null;

  @IsOptional()
  @IsString()
  internalNotes?: string | null;

  @IsOptional()
  @IsObject()
  internalTags?: Record<string, unknown> | null;
}

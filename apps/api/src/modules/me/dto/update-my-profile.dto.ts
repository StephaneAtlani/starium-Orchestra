import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMyProfileDto {
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
  department?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  jobTitle?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  office?: string | null;
}

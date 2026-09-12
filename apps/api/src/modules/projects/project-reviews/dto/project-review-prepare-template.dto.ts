import { IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateProjectReviewPrepareTemplateDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(40)
  typeCode!: string;

  @IsObject()
  payload!: Record<string, unknown>;
}

export class UpdateProjectReviewPrepareTemplateDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ProjectReviewDecisionInputDto {
  @IsString()
  @MaxLength(500)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  description?: string | null;
}

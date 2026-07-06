import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ProjectReviewActionItemContributorInputDto {
  @IsOptional()
  @IsString()
  userId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  displayName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  roleLabel?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  contributionStatus?: string | null;
}

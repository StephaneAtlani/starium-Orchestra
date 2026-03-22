import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class ProjectReviewParticipantInputDto {
  @IsOptional()
  @IsString()
  userId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  displayName?: string | null;

  @IsOptional()
  @IsBoolean()
  attended?: boolean;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
}

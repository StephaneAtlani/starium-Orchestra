import { IsArray, IsOptional, IsString } from 'class-validator';

export class InviteProjectReviewDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  participantIds?: string[];
}

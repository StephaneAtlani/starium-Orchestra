import { IsDateString } from 'class-validator';

export class ScheduleProjectReviewDto {
  @IsDateString()
  reviewDate!: string;
}

import { IsISO8601, IsOptional } from 'class-validator';

export class BudgetLineLandingQueryDto {
  @IsOptional()
  @IsISO8601()
  referenceDate?: string;
}

import { Type } from 'class-transformer';
import {
  IsDate,
  IsNumberString,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateProjectScenarioFinancialLineDto {
  @IsOptional()
  @IsString()
  projectBudgetLinkId?: string | null;

  @IsOptional()
  @IsString()
  budgetLineId?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  costCategory?: string | null;

  @IsOptional()
  @IsNumberString()
  amountPlanned?: string;

  @IsOptional()
  @IsNumberString()
  amountForecast?: string | null;

  @IsOptional()
  @IsNumberString()
  amountActual?: string | null;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currencyCode?: string | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

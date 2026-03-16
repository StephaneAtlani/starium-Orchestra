import { ArrayNotEmpty, IsArray, IsInt, IsNumber, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ManualPlanningMonthDto {
  @IsInt()
  @Min(1)
  @Max(12)
  monthIndex!: number;

  @IsNumber()
  @Min(0)
  amount!: number;
}

export class UpdateBudgetLinePlanningManualDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ManualPlanningMonthDto)
  months!: ManualPlanningMonthDto[];
}


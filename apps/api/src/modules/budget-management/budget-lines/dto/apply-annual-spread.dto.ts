import { ArrayNotEmpty, IsArray, IsInt, IsNumber, Max, Min } from 'class-validator';

export class ApplyAnnualSpreadDto {
  @IsNumber()
  @Min(0)
  annualAmount!: number;

  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(12, { each: true })
  activeMonthIndexes!: number[];
}


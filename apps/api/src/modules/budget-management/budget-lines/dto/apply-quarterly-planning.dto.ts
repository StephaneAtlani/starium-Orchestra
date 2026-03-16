import { ArrayNotEmpty, IsArray, IsIn, IsInt, IsNumber, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class QuarterlyAmountDto {
  @IsInt()
  @IsIn([1, 2, 3, 4])
  quarter!: number;

  @IsNumber()
  @Min(0)
  amount!: number;
}

export class ApplyQuarterlyPlanningDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => QuarterlyAmountDto)
  quarters!: QuarterlyAmountDto[];
}


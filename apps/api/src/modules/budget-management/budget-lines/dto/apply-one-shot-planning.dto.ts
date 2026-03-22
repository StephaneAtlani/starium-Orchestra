import { IsInt, IsNumber, Max, Min } from 'class-validator';

export class ApplyOneShotPlanningDto {
  @IsInt()
  @Min(1)
  @Max(12)
  monthIndex!: number;

  @IsNumber()
  @Min(0)
  amount!: number;
}


import { IsNumber, IsString, IsNotEmpty, Min, Max } from 'class-validator';

export class CostCenterSplitItemDto {
  @IsString()
  @IsNotEmpty()
  costCenterId!: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  percentage!: number;
}

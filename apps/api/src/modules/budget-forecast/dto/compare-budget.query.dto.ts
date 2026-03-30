import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum BudgetComparisonMode {
  BASELINE = 'baseline',
  SNAPSHOT = 'snapshot',
  VERSION = 'version',
}

export class CompareBudgetQueryDto {
  @IsEnum(BudgetComparisonMode)
  compareTo!: BudgetComparisonMode;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  targetId?: string;
}

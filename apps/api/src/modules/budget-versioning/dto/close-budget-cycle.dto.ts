import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CloseBudgetCycleDto {
  @IsOptional()
  @IsBoolean()
  createSnapshot?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  snapshotName?: string;
}

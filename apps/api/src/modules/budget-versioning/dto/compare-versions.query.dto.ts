import { IsNotEmpty, IsString } from 'class-validator';

export class CompareVersionsQueryDto {
  @IsNotEmpty()
  @IsString()
  targetBudgetId!: string;
}

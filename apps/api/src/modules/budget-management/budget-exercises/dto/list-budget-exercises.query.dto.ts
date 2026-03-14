import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BudgetExerciseStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../dto/pagination-query.dto';

export class ListBudgetExercisesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(BudgetExerciseStatus)
  status?: BudgetExerciseStatus;

  @IsOptional()
  @IsString()
  search?: string;
}

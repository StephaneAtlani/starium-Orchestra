import {
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BudgetExerciseStatus } from '@prisma/client';

export class CreateBudgetExerciseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string;

  @IsDate()
  @Type(() => Date)
  startDate!: Date;

  @IsDate()
  @Type(() => Date)
  endDate!: Date;

  @IsOptional()
  @IsEnum(BudgetExerciseStatus)
  status?: BudgetExerciseStatus;
}

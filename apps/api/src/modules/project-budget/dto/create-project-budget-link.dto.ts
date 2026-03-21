import { ProjectBudgetAllocationType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateIf,
} from 'class-validator';

export class CreateProjectBudgetLinkDto {
  @IsString()
  @IsNotEmpty()
  budgetLineId!: string;

  @IsEnum(ProjectBudgetAllocationType)
  allocationType!: ProjectBudgetAllocationType;

  @ValidateIf((o: CreateProjectBudgetLinkDto) =>
    o.allocationType === ProjectBudgetAllocationType.PERCENTAGE,
  )
  @IsNumber()
  @Type(() => Number)
  percentage?: number;

  @ValidateIf(
    (o: CreateProjectBudgetLinkDto) =>
      o.allocationType === ProjectBudgetAllocationType.FIXED,
  )
  @IsNumber()
  @Type(() => Number)
  amount?: number;
}

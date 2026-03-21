import { ProjectBudgetAllocationType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

/** PATCH — ligne, mode (si un seul lien) et détail ; fusion côté service avec l’existant. */
export class UpdateProjectBudgetLinkDto {
  @IsOptional()
  @IsString()
  budgetLineId?: string;

  @IsOptional()
  @IsEnum(ProjectBudgetAllocationType)
  allocationType?: ProjectBudgetAllocationType;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  percentage?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  amount?: number;
}

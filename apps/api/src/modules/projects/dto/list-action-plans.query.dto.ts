import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ActionPlanPriority, ActionPlanStatus } from '@prisma/client';

export enum ActionPlanOwnerFilter {
  ASSIGNED = 'ASSIGNED',
  UNASSIGNED = 'UNASSIGNED',
}

export class ListActionPlansQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ActionPlanStatus)
  status?: ActionPlanStatus;

  @IsOptional()
  @IsEnum(ActionPlanPriority)
  priority?: ActionPlanPriority;

  @IsOptional()
  @IsEnum(ActionPlanOwnerFilter)
  owner?: ActionPlanOwnerFilter;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

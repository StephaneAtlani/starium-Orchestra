import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import {
  PROJECT_SCENARIO_TASK_TYPES,
  type ProjectScenarioTaskType,
} from './project-scenario-task.dto';

export class UpdateProjectScenarioTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsEnum(PROJECT_SCENARIO_TASK_TYPES)
  taskType?: ProjectScenarioTaskType | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  durationDays?: number | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  dependencyIds?: string[] | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  orderIndex?: number;
}

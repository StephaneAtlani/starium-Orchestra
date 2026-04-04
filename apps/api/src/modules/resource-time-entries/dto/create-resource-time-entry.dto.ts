import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { TimeEntryStatus } from '@prisma/client';

export class CreateResourceTimeEntryDto {
  @IsUUID()
  resourceId!: string;

  /** ISO 8601 date-time ; la date calendaire utilisée est celle en UTC. */
  @IsString()
  @IsNotEmpty()
  workDate!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(999999.99)
  durationHours!: number;

  @IsOptional()
  @IsUUID()
  projectId?: string | null;

  @IsOptional()
  @IsUUID()
  activityTypeId?: string | null;

  @IsOptional()
  @IsEnum(TimeEntryStatus)
  status?: TimeEntryStatus;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string | null;
}

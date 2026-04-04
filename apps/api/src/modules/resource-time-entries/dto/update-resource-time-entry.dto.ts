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
  ValidateIf,
} from 'class-validator';
import { TimeEntryStatus } from '@prisma/client';

export class UpdateResourceTimeEntryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  workDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(999999.99)
  durationHours?: number;

  @IsOptional()
  @ValidateIf((_, o: UpdateResourceTimeEntryDto) => o.projectId !== null)
  @IsUUID()
  projectId?: string | null;

  @IsOptional()
  @ValidateIf((_, o: UpdateResourceTimeEntryDto) => o.activityTypeId !== null)
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

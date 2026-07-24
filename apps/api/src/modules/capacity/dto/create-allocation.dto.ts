import { CapacityAllocationSourceType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class CreateAllocationDto {
  @Type(() => Date)
  @IsDate()
  startDate!: Date;

  @Type(() => Date)
  @IsDate()
  endDate!: Date;

  /** J/H total > 0 (Decimal string). */
  @IsNumberString()
  totalDays!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  comment?: string | null;

  @ValidateIf((o: CreateAllocationDto) => !o.resourceId)
  @IsString()
  workTeamId?: string;

  @ValidateIf((o: CreateAllocationDto) => !o.workTeamId)
  @IsString()
  resourceId?: string;

  @IsOptional()
  @IsEnum(CapacityAllocationSourceType)
  sourceType?: CapacityAllocationSourceType;

  @ValidateIf(
    (o: CreateAllocationDto) =>
      o.sourceType != null &&
      o.sourceType !== CapacityAllocationSourceType.MANUAL,
  )
  @IsString()
  sourceId?: string | null;
}

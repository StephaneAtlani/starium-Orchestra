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

export class UpdateAllocationDto {
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @IsOptional()
  @IsNumberString()
  totalDays?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  comment?: string | null;

  @IsOptional()
  @ValidateIf((o: UpdateAllocationDto) => o.workTeamId !== null)
  @IsString()
  workTeamId?: string | null;

  @IsOptional()
  @ValidateIf((o: UpdateAllocationDto) => o.resourceId !== null)
  @IsString()
  resourceId?: string | null;

  @IsOptional()
  @IsEnum(CapacityAllocationSourceType)
  sourceType?: CapacityAllocationSourceType;

  @IsOptional()
  @ValidateIf(
    (o: UpdateAllocationDto) =>
      o.sourceType != null &&
      o.sourceType !== CapacityAllocationSourceType.MANUAL,
  )
  @IsString()
  sourceId?: string | null;
}

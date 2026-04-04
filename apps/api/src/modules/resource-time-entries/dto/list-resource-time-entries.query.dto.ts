import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { TimeEntryStatus } from '@prisma/client';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class ListResourceTimeEntriesQueryDto {
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsUUID()
  resourceId?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsEnum(TimeEntryStatus)
  status?: TimeEntryStatus;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  @Matches(ISO_DATE, { message: 'from must be ISO date YYYY-MM-DD' })
  from?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  @Matches(ISO_DATE, { message: 'to must be ISO date YYYY-MM-DD' })
  to?: string;
}

import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { OWNERSHIP_TRANSFER_RESOURCE_TYPES } from '../ownership-transfer-resource-types';

export class TransferOwnershipDto {
  @IsString()
  @MinLength(1)
  fromOrgUnitId!: string;

  @IsString()
  @MinLength(1)
  toOrgUnitId!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(OWNERSHIP_TRANSFER_RESOURCE_TYPES, { each: true })
  resourceTypes!: (typeof OWNERSHIP_TRANSFER_RESOURCE_TYPES)[number][];

  @IsBoolean()
  dryRun!: boolean;

  @IsOptional()
  @IsBoolean()
  confirmApply?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

import { GovernanceCycleItemDecisionStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class InstanceItemDecisionPatchDto {
  @IsString()
  itemId!: string;

  @IsEnum(GovernanceCycleItemDecisionStatus)
  decisionStatus!: GovernanceCycleItemDecisionStatus;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  decisionReason?: string | null;
}

export class UpsertInstanceItemDecisionsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InstanceItemDecisionPatchDto)
  decisions!: InstanceItemDecisionPatchDto[];
}

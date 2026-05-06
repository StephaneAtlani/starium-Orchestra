import {
  ClientSubscriptionStatus,
  SubscriptionBillingPeriod,
} from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
} from 'class-validator';

export class UpdateClientSubscriptionDto {
  @IsOptional()
  @IsEnum(ClientSubscriptionStatus)
  status?: ClientSubscriptionStatus;

  @IsOptional()
  @IsEnum(SubscriptionBillingPeriod)
  billingPeriod?: SubscriptionBillingPeriod;

  @IsOptional()
  @IsInt()
  @IsPositive()
  readWriteSeatsLimit?: number;

  @IsOptional()
  @IsDateString()
  startsAt?: string | null;

  @IsOptional()
  @IsDateString()
  endsAt?: string | null;

  @IsOptional()
  @IsDateString()
  graceEndsAt?: string | null;
}

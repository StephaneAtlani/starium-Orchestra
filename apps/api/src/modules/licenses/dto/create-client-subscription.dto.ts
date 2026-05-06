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

export class CreateClientSubscriptionDto {
  @IsOptional()
  @IsEnum(ClientSubscriptionStatus)
  status?: ClientSubscriptionStatus;

  @IsOptional()
  @IsEnum(SubscriptionBillingPeriod)
  billingPeriod?: SubscriptionBillingPeriod;

  @IsInt()
  @IsPositive()
  readWriteSeatsLimit!: number;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsDateString()
  graceEndsAt?: string;
}

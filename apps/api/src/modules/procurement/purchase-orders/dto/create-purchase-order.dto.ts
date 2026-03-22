import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsNumberString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePurchaseOrderDto {
  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  supplierName?: string;

  @IsOptional()
  @IsString()
  budgetLineId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  reference?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  label!: string;

  @IsNumberString()
  amountHt!: string;

  @IsOptional()
  @IsNumberString()
  taxRate?: string;

  @Type(() => Date)
  @IsDate()
  orderDate!: Date;
}


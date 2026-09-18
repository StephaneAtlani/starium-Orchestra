import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ProcedureCategory } from '@prisma/client';

export class CreateProcedureDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsEnum(ProcedureCategory)
  category?: ProcedureCategory;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  ownerUserId?: string;
}

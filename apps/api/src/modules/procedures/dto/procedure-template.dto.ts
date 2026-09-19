import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class ProcedureTemplateOutlineItemDto {
  @Type(() => Number)
  @IsIn([1, 2, 3])
  level!: 1 | 2 | 3;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;
}

export class CreateProcedureTemplateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @IsNotEmpty()
  categoryId?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ProcedureTemplateOutlineItemDto)
  outline?: ProcedureTemplateOutlineItemDto[];
}

export class UpdateProcedureTemplateDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name?: string;

  /** Passer `null` pour retirer la catégorie. */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  categoryId?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ProcedureTemplateOutlineItemDto)
  outline?: ProcedureTemplateOutlineItemDto[];
}

export class TransitionProcedureTemplateDto {
  @IsIn(['ACTIVE', 'ARCHIVED', 'DRAFT'])
  status!: 'ACTIVE' | 'ARCHIVED' | 'DRAFT';
}

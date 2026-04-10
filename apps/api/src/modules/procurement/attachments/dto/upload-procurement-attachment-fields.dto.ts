import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ProcurementAttachmentCategory } from '@prisma/client';

export class UploadProcurementAttachmentFieldsDto {
  @IsOptional()
  @IsString()
  @MaxLength(512)
  name?: string;

  @IsOptional()
  @IsEnum(ProcurementAttachmentCategory)
  category?: ProcurementAttachmentCategory;
}

import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ContractAttachmentCategory } from '@prisma/client';

export class UploadContractAttachmentFieldsDto {
  @IsOptional()
  @IsString()
  @MaxLength(512)
  name?: string;

  @IsOptional()
  @IsEnum(ContractAttachmentCategory)
  category?: ContractAttachmentCategory;
}

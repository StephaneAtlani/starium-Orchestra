import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import {
  ChatbotKnowledgeEntryType,
  ChatbotKnowledgeScope,
  ClientUserRole,
} from '@prisma/client';

export class CreateChatbotEntryDto {
  @IsString()
  @MaxLength(200)
  slug!: string;

  @IsString()
  @MaxLength(500)
  title!: string;

  @IsString()
  @MaxLength(4000)
  question!: string;

  @IsString()
  @MaxLength(8000)
  answer!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  moduleCode?: string | null;

  @IsOptional()
  @IsEnum(ClientUserRole)
  targetRole?: ClientUserRole | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  requiredPermission?: string | null;

  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @IsEnum(ChatbotKnowledgeEntryType)
  type!: ChatbotKnowledgeEntryType;

  @IsEnum(ChatbotKnowledgeScope)
  scope!: ChatbotKnowledgeScope;

  @IsOptional()
  @IsString()
  clientId?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsBoolean()
  isPopular?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  icon?: string | null;

  @IsOptional()
  @IsString()
  content?: string | null;

  @IsOptional()
  structuredLinks?: unknown;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedEntryIds?: string[];
}

export class UpdateChatbotEntryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  question?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  answer?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  moduleCode?: string | null;

  @IsOptional()
  @IsEnum(ClientUserRole)
  targetRole?: ClientUserRole | null;

  @IsOptional()
  @IsString()
  requiredPermission?: string | null;

  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @IsOptional()
  @IsEnum(ChatbotKnowledgeEntryType)
  type?: ChatbotKnowledgeEntryType;

  @IsOptional()
  @IsEnum(ChatbotKnowledgeScope)
  scope?: ChatbotKnowledgeScope;

  @IsOptional()
  @IsString()
  clientId?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsBoolean()
  isPopular?: boolean;

  @IsOptional()
  @IsString()
  icon?: string | null;

  @IsOptional()
  @IsString()
  content?: string | null;

  @IsOptional()
  structuredLinks?: unknown;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedEntryIds?: string[];
}

import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateProcedureDto {
  /** Optionnel — généré à la publication si omis. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  /** Catégorie active du client (défaut PILOTAGE si omis). */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  ownerUserId?: string;

  /** Modèle ACTIVE optionnel — copie figée de l'outline à la création. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  templateId?: string;
}

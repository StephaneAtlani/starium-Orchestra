import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { STARIUM_FEEDBACK_CATEGORY_CODES } from './starium-feedback-category';

export class PostChatbotFeedbackDto {
  @IsString()
  @IsIn([...STARIUM_FEEDBACK_CATEGORY_CODES], {
    message: 'Catégorie invalide.',
  })
  category!: (typeof STARIUM_FEEDBACK_CATEGORY_CODES)[number];

  @IsString()
  @MinLength(10, { message: 'Le message doit contenir au moins 10 caractères.' })
  @MaxLength(4000)
  message!: string;

  /** Chemin ou URL de la page d’origine (optionnel, ex. /dashboard). */
  @IsOptional()
  @IsString()
  @MaxLength(512)
  pagePath?: string;
}

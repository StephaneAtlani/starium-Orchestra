import { IsEnum, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { PlatformLoginNewsType } from '@prisma/client';
import { PLATFORM_LOGIN_NEWS_MAX_LENGTH } from '../platform-login-news.constants';

export class UpdatePlatformLoginNewsDto {
  /** Message affiché sur l’écran de connexion ; `null` ou chaîne vide pour masquer. */
  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @IsString()
  @MaxLength(PLATFORM_LOGIN_NEWS_MAX_LENGTH)
  message?: string | null;

  /** Niveau visuel du message : information, avertissement ou urgent. */
  @IsOptional()
  @IsEnum(PlatformLoginNewsType)
  messageType?: PlatformLoginNewsType;
}

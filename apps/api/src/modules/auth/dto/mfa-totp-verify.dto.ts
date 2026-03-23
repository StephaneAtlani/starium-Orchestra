import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class MfaTotpVerifyDto {
  @IsString()
  @IsNotEmpty()
  challengeId!: string;

  /** TOTP (6 chiffres) ou code de secours */
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9A-Za-z\s-]+$/)
  otp!: string;

  /** Enregistrer cet appareil comme de confiance (pas de 2FA pendant 30 j sur ce navigateur). */
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  trustDevice?: boolean;
}

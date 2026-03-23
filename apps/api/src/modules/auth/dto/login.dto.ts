import { IsEmail, IsOptional, IsString, Length, Matches, MinLength } from 'class-validator';

/** Payload POST /auth/login — email + password. */
export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1, { message: 'Le mot de passe est requis' })
  password!: string;

  /** Jeton d’appareil de confiance (64 caractères hex), optionnel. */
  @IsOptional()
  @IsString()
  @Length(64, 64)
  @Matches(/^[a-f0-9]{64}$/)
  trustedDeviceToken?: string;
}

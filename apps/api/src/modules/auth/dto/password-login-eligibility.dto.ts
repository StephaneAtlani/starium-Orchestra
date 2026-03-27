import { IsEmail } from 'class-validator';

/** POST /auth/password-login-eligibility — savoir si le mot de passe est autorisé pour cet email (UX login). */
export class PasswordLoginEligibilityDto {
  @IsEmail()
  email!: string;
}

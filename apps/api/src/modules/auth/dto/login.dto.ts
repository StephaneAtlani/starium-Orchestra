import { IsEmail, IsString, MinLength } from 'class-validator';

/** Payload POST /auth/login — email + password. */
export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1, { message: 'Le mot de passe est requis' })
  password!: string;
}

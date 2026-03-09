import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

/** Payload POST /platform/users — création d'un utilisateur global (sans rattachement client). */
export class CreatePlatformUserDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  password!: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;
}


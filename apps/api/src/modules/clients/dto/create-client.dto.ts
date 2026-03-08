import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

/** Payload POST /clients — name, slug, adminEmail ; adminPassword optionnel au DTO, obligatoire côté service si User inexistant. */
export class CreateClientDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  slug!: string;

  @IsEmail()
  @IsNotEmpty()
  adminEmail!: string;

  @IsString()
  @MinLength(8, {
    message: 'Le mot de passe doit contenir au moins 8 caractères',
  })
  @IsOptional()
  adminPassword?: string;

  @IsString()
  @IsOptional()
  adminFirstName?: string;

  @IsString()
  @IsOptional()
  adminLastName?: string;
}

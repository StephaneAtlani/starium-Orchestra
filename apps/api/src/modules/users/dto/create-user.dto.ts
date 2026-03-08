import { ClientUserRole } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';

/** Payload POST /users — email + role obligatoires ; password obligatoire si nouvel utilisateur. */
export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsEnum(ClientUserRole)
  role!: ClientUserRole;

  @ValidateIf((o) => o.email != null)
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  @IsOptional()
  password?: string;
}

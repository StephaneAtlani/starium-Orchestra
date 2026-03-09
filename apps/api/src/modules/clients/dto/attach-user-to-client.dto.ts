import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ClientUserRole, ClientUserStatus } from '@prisma/client';

/** Payload POST /clients/:clientId/users — rattachement d'un user à un client par le Platform Admin. */
export class AttachUserToClientDto {
  @IsString()
  @IsOptional()
  userId?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @ValidateIf((o) => o.email != null && !o.userId)
  @IsString()
  @MinLength(8, {
    message: 'Le mot de passe doit contenir au moins 8 caractères',
  })
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsEnum(ClientUserRole)
  role!: ClientUserRole;

  @IsEnum(ClientUserStatus)
  status!: ClientUserStatus;
}


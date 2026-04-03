import { ClientUserRole, ClientUserStatus } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

/** Payload PATCH /users/:id — tous les champs optionnels (firstName, lastName, role, status). */
export class UpdateUserDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsEnum(ClientUserRole)
  @IsOptional()
  role?: ClientUserRole;

  @IsEnum(ClientUserStatus)
  @IsOptional()
  status?: ClientUserStatus;

  @IsBoolean()
  @IsOptional()
  excludeFromResourceCatalog?: boolean;
}

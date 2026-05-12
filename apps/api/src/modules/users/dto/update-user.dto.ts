import { ClientUserRole, ClientUserStatus } from '@prisma/client';
import { Allow, IsBoolean, IsEnum, IsOptional, IsString, Matches } from 'class-validator';

/** Payload PATCH /users/:id — tous les champs optionnels (firstName, lastName, role, status). */
export class UpdateUserDto {
  /**
   * RFC-ORG-002 — absent : pas de changement ; `null` : délier la fiche HUMAN ; string : CUID.
   */
  @Allow()
  @IsOptional()
  @IsString()
  @Matches(/^c[a-z0-9]{24}$/i, {
    message: 'humanResourceId doit être un identifiant valide (CUID)',
  })
  humanResourceId?: string | null;

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

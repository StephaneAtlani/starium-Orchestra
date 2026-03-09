import { IsOptional, IsString } from 'class-validator';

/** Payload PATCH /roles/:id — mise à jour d'un rôle métier. */
export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}


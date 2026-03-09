import { ArrayUnique, IsArray, IsString } from 'class-validator';

/** Payload PUT /users/:id/roles — remplacement des rôles d'un utilisateur dans le client actif. */
export class UpdateUserRolesDto {
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  roleIds!: string[];
}


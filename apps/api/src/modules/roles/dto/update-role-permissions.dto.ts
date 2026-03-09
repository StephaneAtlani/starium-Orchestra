import { ArrayUnique, IsArray, IsString } from 'class-validator';

/** Payload PUT /roles/:id/permissions — remplacement des permissions d'un rôle. */
export class UpdateRolePermissionsDto {
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissionIds!: string[];
}


import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/** Payload POST /roles — création d'un rôle métier dans le client actif. */
export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}


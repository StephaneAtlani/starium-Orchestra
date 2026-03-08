import { IsOptional, IsString } from 'class-validator';

/** Payload PATCH /clients/:id — name et slug optionnels. */
export class UpdateClientDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  slug?: string;
}

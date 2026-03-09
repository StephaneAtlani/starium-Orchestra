import { IsNotEmpty, IsString } from 'class-validator';

/** Payload POST /clients — création simple d'un client (name, slug uniquement). */
export class CreateClientDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  slug!: string;
}

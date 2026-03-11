import { IsNotEmpty, IsString } from 'class-validator';

/** Payload PATCH /me/default-client — client à définir comme par défaut (RFC-009-1). */
export class SetDefaultClientDto {
  @IsString()
  @IsNotEmpty()
  clientId!: string;
}

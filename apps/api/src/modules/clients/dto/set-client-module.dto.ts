import { IsNotEmpty, IsString } from 'class-validator';

/** Payload POST /clients/:clientId/modules — activation d'un module pour un client. */
export class SetClientModuleDto {
  @IsString()
  @IsNotEmpty()
  moduleCode!: string;
}


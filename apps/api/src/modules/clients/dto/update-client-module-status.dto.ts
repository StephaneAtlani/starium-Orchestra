import { IsIn } from 'class-validator';

/** Payload PATCH /clients/:clientId/modules/:moduleCode — changement de statut ENABLED/DISABLED. */
export class UpdateClientModuleStatusDto {
  @IsIn(['ENABLED', 'DISABLED'])
  status!: 'ENABLED' | 'DISABLED';
}


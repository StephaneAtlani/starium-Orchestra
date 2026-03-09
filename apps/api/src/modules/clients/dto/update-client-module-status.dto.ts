import { IsEnum } from 'class-validator';
import { ClientModuleStatus } from '@prisma/client';

/** Payload PATCH /clients/:clientId/modules/:moduleCode — changement de statut ENABLED/DISABLED. */
export class UpdateClientModuleStatusDto {
  @IsEnum(ClientModuleStatus)
  status!: ClientModuleStatus;
}


import { CollaboratorStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateCollaboratorStatusDto {
  @IsEnum(CollaboratorStatus)
  status!: CollaboratorStatus;
}

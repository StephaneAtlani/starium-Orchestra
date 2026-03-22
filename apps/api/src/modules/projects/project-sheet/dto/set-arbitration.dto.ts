import { IsEnum } from 'class-validator';
import { ProjectArbitrationStatus } from '@prisma/client';

export class SetArbitrationDto {
  @IsEnum(ProjectArbitrationStatus)
  status!: ProjectArbitrationStatus;
}

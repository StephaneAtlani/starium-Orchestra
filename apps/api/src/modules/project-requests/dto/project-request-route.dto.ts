import { ProjectRequestRoutingTarget } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class ProjectRequestRouteDto {
  @IsEnum(ProjectRequestRoutingTarget)
  target!: ProjectRequestRoutingTarget;
}

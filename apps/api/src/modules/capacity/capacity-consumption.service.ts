import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CapacityAllocationSourceType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  resolveActionPlanConsumesCapacity,
  resolveProjectConsumesCapacity,
  resolveProjectRiskConsumesCapacity,
} from './lib/resolve-consumes-capacity';

@Injectable()
export class CapacityConsumptionService {
  constructor(private readonly prisma: PrismaService) {}

  async assertSourceCanEmit(
    clientId: string,
    sourceType: CapacityAllocationSourceType,
    sourceId: string,
  ): Promise<boolean> {
    if (sourceType === CapacityAllocationSourceType.MANUAL) return true;

    if (sourceType === CapacityAllocationSourceType.PROJECT) {
      return this.resolveProject(clientId, sourceId);
    }
    if (sourceType === CapacityAllocationSourceType.PROJECT_RISK) {
      return this.resolveProjectRisk(clientId, sourceId);
    }
    if (sourceType === CapacityAllocationSourceType.ACTION_PLAN) {
      return this.resolveActionPlan(clientId, sourceId);
    }
    return false;
  }

  async resolveProject(clientId: string, projectId: string): Promise<boolean> {
    const p = await this.prisma.project.findFirst({
      where: { id: projectId, clientId },
      select: { consumesCapacity: true, parentProjectId: true },
    });
    if (!p) throw new NotFoundException('Source introuvable');
    return resolveProjectConsumesCapacity(
      p.consumesCapacity,
      p.parentProjectId,
    );
  }

  async resolveProjectRisk(clientId: string, riskId: string): Promise<boolean> {
    const r = await this.prisma.projectRisk.findFirst({
      where: { id: riskId, clientId },
      select: { consumesCapacity: true, projectId: true },
    });
    if (!r) throw new NotFoundException('Source introuvable');
    return resolveProjectRiskConsumesCapacity(
      r.consumesCapacity,
      r.projectId,
    );
  }

  async resolveActionPlan(
    clientId: string,
    actionPlanId: string,
  ): Promise<boolean> {
    const plan = await this.prisma.actionPlan.findFirst({
      where: { id: actionPlanId, clientId },
      select: { consumesCapacity: true },
    });
    if (!plan) throw new NotFoundException('Source introuvable');
    const tasks = await this.prisma.projectTask.findMany({
      where: { clientId, actionPlanId },
      select: { projectId: true, riskId: true },
    });
    const resolved = resolveActionPlanConsumesCapacity(
      plan.consumesCapacity,
      tasks,
    );
    if (resolved.status === 'reject') {
      throw new BadRequestException(
        'Un plan d’action lié à un projet ou un risque ne peut pas porter sa capacité',
      );
    }
    return resolved.consumes;
  }
}

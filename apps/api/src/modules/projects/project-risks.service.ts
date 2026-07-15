import { Injectable, NotFoundException } from '@nestjs/common';
import { ProjectRiskStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuditContext } from '../budget-management/types/audit-context';
import { ClientScopedRisksService } from './client-scoped-risks.service';
import { CreateProjectRiskDto } from './dto/create-project-risk.dto';
import { UpdateProjectRiskDto } from './dto/update-project-risk.dto';
import { assertProjectSheetEditable } from './lib/project-sheet-editing-locked';

/**
 * Façade pour les routes `projects/:projectId/risks` — délègue au cœur métier
 * [`ClientScopedRisksService`](./client-scoped-risks.service.ts).
 */
@Injectable()
export class ProjectRisksService {
  constructor(
    private readonly clientScopedRisks: ClientScopedRisksService,
    private readonly prisma: PrismaService,
  ) {}

  private async assertProjectSheetEditable(clientId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, clientId },
    });
    if (!project) throw new NotFoundException('Project not found');
    assertProjectSheetEditable(project);
  }

  list(clientId: string, projectId: string) {
    return this.clientScopedRisks.listForProject(clientId, projectId);
  }

  getOne(clientId: string, projectId: string, riskId: string) {
    return this.clientScopedRisks.getOneForProject(clientId, projectId, riskId);
  }

  async create(
    clientId: string,
    projectId: string,
    dto: CreateProjectRiskDto,
    context?: AuditContext,
  ) {
    await this.assertProjectSheetEditable(clientId, projectId);
    return this.clientScopedRisks.createForProject(clientId, projectId, dto, context);
  }

  async update(
    clientId: string,
    projectId: string,
    riskId: string,
    dto: UpdateProjectRiskDto,
    context?: AuditContext,
  ) {
    await this.assertProjectSheetEditable(clientId, projectId);
    return this.clientScopedRisks.updateForProject(clientId, projectId, riskId, dto, context);
  }

  async updateStatus(
    clientId: string,
    projectId: string,
    riskId: string,
    status: ProjectRiskStatus,
    context?: AuditContext,
  ) {
    await this.assertProjectSheetEditable(clientId, projectId);
    return this.clientScopedRisks.updateStatusForProject(
      clientId,
      projectId,
      riskId,
      status,
      context,
    );
  }

  async delete(clientId: string, projectId: string, riskId: string, context?: AuditContext) {
    await this.assertProjectSheetEditable(clientId, projectId);
    return this.clientScopedRisks.deleteForProject(clientId, projectId, riskId, context);
  }
}

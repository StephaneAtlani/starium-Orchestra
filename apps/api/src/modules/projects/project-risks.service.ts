import { Injectable } from '@nestjs/common';
import { ProjectRiskStatus } from '@prisma/client';
import type { AuditContext } from '../budget-management/types/audit-context';
import { ClientScopedRisksService } from './client-scoped-risks.service';
import { CreateProjectRiskDto } from './dto/create-project-risk.dto';
import { UpdateProjectRiskDto } from './dto/update-project-risk.dto';

/**
 * Façade pour les routes `projects/:projectId/risks` — délègue au cœur métier
 * [`ClientScopedRisksService`](./client-scoped-risks.service.ts).
 */
@Injectable()
export class ProjectRisksService {
  constructor(private readonly clientScopedRisks: ClientScopedRisksService) {}

  list(clientId: string, projectId: string) {
    return this.clientScopedRisks.listForProject(clientId, projectId);
  }

  getOne(clientId: string, projectId: string, riskId: string) {
    return this.clientScopedRisks.getOneForProject(clientId, projectId, riskId);
  }

  create(
    clientId: string,
    projectId: string,
    dto: CreateProjectRiskDto,
    context?: AuditContext,
  ) {
    return this.clientScopedRisks.createForProject(clientId, projectId, dto, context);
  }

  update(
    clientId: string,
    projectId: string,
    riskId: string,
    dto: UpdateProjectRiskDto,
    context?: AuditContext,
  ) {
    return this.clientScopedRisks.updateForProject(clientId, projectId, riskId, dto, context);
  }

  updateStatus(
    clientId: string,
    projectId: string,
    riskId: string,
    status: ProjectRiskStatus,
    context?: AuditContext,
  ) {
    return this.clientScopedRisks.updateStatusForProject(
      clientId,
      projectId,
      riskId,
      status,
      context,
    );
  }

  delete(clientId: string, projectId: string, riskId: string, context?: AuditContext) {
    return this.clientScopedRisks.deleteForProject(clientId, projectId, riskId, context);
  }
}

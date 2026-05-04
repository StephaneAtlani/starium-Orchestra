import { NotFoundException } from '@nestjs/common';
import {
  ProjectRiskCriticality,
  ProjectRiskStatus,
  ProjectRiskTreatmentStrategy,
} from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  PROJECT_AUDIT_ACTION,
  PROJECT_AUDIT_RESOURCE_TYPE,
} from './project-audit.constants';
import { ClientScopedRisksService } from './client-scoped-risks.service';
import { ProjectRisksService } from './project-risks.service';
import { ProjectsService } from './projects.service';
import { RiskTaxonomyService } from '../risk-taxonomy/risk-taxonomy.service';

describe('ProjectRisksService — audit RFC-PROJ-009', () => {
  let service: ProjectRisksService;
  let prisma: any;
  let auditLogs: { create: jest.Mock };
  let projects: { getProjectForScope: jest.Mock; assertClientUser: jest.Mock };
  let riskTaxonomy: { assertUsableRiskTypeForWrite: jest.Mock };

  const clientId = 'c1';
  const projectId = 'p1';
  const riskId = 'r1';

  function baseRisk(overrides: Record<string, unknown> = {}) {
    return {
      id: riskId,
      clientId,
      projectId,
      code: 'R-001',
      title: 'Risque',
      description: null,
      category: null,
      threatSource: '—',
      businessImpact: '—',
      likelihoodJustification: null,
      impactCategory: null,
      probability: 2,
      impact: 2,
      criticalityScore: 4,
      criticalityLevel: 'LOW' as ProjectRiskCriticality,
      mitigationPlan: null,
      contingencyPlan: null,
      ownerUserId: null,
      status: ProjectRiskStatus.OPEN,
      reviewDate: null,
      dueDate: null,
      detectedAt: null,
      closedAt: null,
      sortOrder: 0,
      complianceRequirementId: null,
      riskTypeId: 'rt1',
      treatmentStrategy: ProjectRiskTreatmentStrategy.REDUCE,
      residualRiskLevel: null,
      residualJustification: null,
      complementaryTreatmentMeasures: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  beforeEach(() => {
    prisma = {
      projectRisk: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    projects = {
      getProjectForScope: jest.fn().mockResolvedValue({ id: projectId }),
      assertClientUser: jest.fn().mockResolvedValue(undefined),
    };
    riskTaxonomy = {
      assertUsableRiskTypeForWrite: jest.fn().mockResolvedValue(undefined),
    };
    const clientScoped = new ClientScopedRisksService(
      prisma,
      auditLogs as unknown as AuditLogsService,
      projects as unknown as ProjectsService,
      riskTaxonomy as unknown as RiskTaxonomyService,
    );
    service = new ProjectRisksService(clientScoped);
  });

  it('update standard : uniquement project_risk.updated', async () => {
    const existing = baseRisk({ title: 'A' });
    const updated = { ...existing, title: 'B' };
    prisma.projectRisk.findFirst.mockResolvedValue(existing);
    prisma.projectRisk.update.mockResolvedValue(updated);

    await service.update(
      clientId,
      projectId,
      riskId,
      { title: 'B' },
      { actorUserId: 'u1', meta: {} },
    );

    expect(auditLogs.create).toHaveBeenCalledTimes(1);
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: PROJECT_AUDIT_ACTION.PROJECT_RISK_UPDATED,
        resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_RISK,
        oldValue: expect.objectContaining({ title: 'A' }),
        newValue: expect.objectContaining({ title: 'B' }),
      }),
    );
  });

  it('changement probability/impact seul : uniquement project_risk.level.updated', async () => {
    const existing = baseRisk({
      probability: 1,
      impact: 1,
      criticalityScore: 1,
      criticalityLevel: 'LOW' as ProjectRiskCriticality,
    });
    const updated = {
      ...existing,
      probability: 5,
      impact: 3,
      criticalityScore: 15,
      criticalityLevel: 'HIGH' as ProjectRiskCriticality,
    };
    prisma.projectRisk.findFirst.mockResolvedValue(existing);
    prisma.projectRisk.update.mockResolvedValue(updated);

    await service.update(
      clientId,
      projectId,
      riskId,
      { probability: 5, impact: 3 },
      { actorUserId: 'u1', meta: {} },
    );

    expect(auditLogs.create).toHaveBeenCalledTimes(1);
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: PROJECT_AUDIT_ACTION.PROJECT_RISK_LEVEL_UPDATED,
        resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_RISK,
        oldValue: {
          probability: 1,
          impact: 1,
          criticalityScore: 1,
          criticalityLevel: 'LOW',
        },
        newValue: {
          probability: 5,
          impact: 3,
          criticalityScore: 15,
          criticalityLevel: 'HIGH',
        },
      }),
    );
  });

  it('titre + niveau : project_risk.updated (sans prob/impact dupliqués) + level.updated', async () => {
    const existing = baseRisk({
      title: 'A',
      probability: 1,
      impact: 1,
      criticalityScore: 1,
      criticalityLevel: 'LOW' as ProjectRiskCriticality,
    });
    const updated = {
      ...existing,
      title: 'B',
      probability: 5,
      impact: 1,
      criticalityScore: 5,
      criticalityLevel: 'MEDIUM' as ProjectRiskCriticality,
    };
    prisma.projectRisk.findFirst.mockResolvedValue(existing);
    prisma.projectRisk.update.mockResolvedValue(updated);

    await service.update(
      clientId,
      projectId,
      riskId,
      { title: 'B', probability: 5 },
      { actorUserId: 'u1', meta: {} },
    );

    expect(auditLogs.create).toHaveBeenCalledTimes(2);
    expect(auditLogs.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        action: PROJECT_AUDIT_ACTION.PROJECT_RISK_UPDATED,
        oldValue: { title: 'A' },
        newValue: { title: 'B' },
      }),
    );
    expect(auditLogs.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        action: PROJECT_AUDIT_ACTION.PROJECT_RISK_LEVEL_UPDATED,
        oldValue: {
          probability: 1,
          impact: 1,
          criticalityScore: 1,
          criticalityLevel: 'LOW',
        },
        newValue: {
          probability: 5,
          impact: 1,
          criticalityScore: 5,
          criticalityLevel: 'MEDIUM',
        },
      }),
    );
  });

  it('update : risque absent sans audit', async () => {
    prisma.projectRisk.findFirst.mockResolvedValue(null);

    await expect(
      service.update(clientId, projectId, riskId, { title: 'x' }),
    ).rejects.toThrow(NotFoundException);
    expect(auditLogs.create).not.toHaveBeenCalled();
  });
});

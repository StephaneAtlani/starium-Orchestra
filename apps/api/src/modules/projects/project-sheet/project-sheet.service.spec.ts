import {
  Prisma,
  Project,
  ProjectArbitrationLevelStatus,
  ProjectArbitrationStatus,
  ProjectCopilRecommendation,
  ProjectRiskImpact,
  ProjectRiskProbability,
  ProjectRiskStatus,
} from '@prisma/client';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { PROJECT_AUDIT_ACTION, PROJECT_AUDIT_RESOURCE_TYPE } from '../project-audit.constants';
import { ProjectSheetService } from './project-sheet.service';

describe('ProjectSheetService — RFC-PROJ-012', () => {
  let service: ProjectSheetService;
  let prisma: {
    project: {
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    projectRisk: {
      findMany: jest.Mock;
    };
  };
  let auditLogs: { create: jest.Mock };

  const clientId = 'c1';
  const projectId = 'p1';

  function baseProject(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      id: projectId,
      clientId,
      name: 'Migration ERP',
      code: 'MIG-1',
      description: null,
      cadreLocation: null,
      cadreQui: null,
      involvedTeams: null,
      kind: 'PROJECT',
      type: 'GOVERNANCE',
      status: 'DRAFT',
      priority: 'MEDIUM',
      sponsorUserId: null,
      ownerUserId: null,
      startDate: null,
      targetEndDate: null,
      actualEndDate: null,
      criticality: 'MEDIUM',
      progressPercent: null,
      targetBudgetAmount: null,
      pilotNotes: null,
      businessValueScore: 4,
      strategicAlignment: 5,
      urgencyScore: 3,
      estimatedCost: new Prisma.Decimal(50000),
      estimatedGain: new Prisma.Decimal(80000),
      roi: new Prisma.Decimal(0.6),
      riskLevel: 'LOW' as const,
      riskResponse: null,
      priorityScore: new Prisma.Decimal(5),
      arbitrationStatus: null as ProjectArbitrationStatus | null,
      arbitrationMetierStatus: ProjectArbitrationLevelStatus.BROUILLON,
      arbitrationComiteStatus: null,
      arbitrationCodirStatus: null,
      arbitrationMetierRefusalNote: null,
      arbitrationComiteRefusalNote: null,
      arbitrationCodirRefusalNote: null,
      copilRecommendation: ProjectCopilRecommendation.NOT_SET,
      businessProblem: null,
      businessBenefits: null,
      businessSuccessKpis: null,
      swotStrengths: null,
      swotWeaknesses: null,
      swotOpportunities: null,
      swotThreats: null,
      towsActions: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  beforeEach(() => {
    prisma = {
      project: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      projectRisk: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    service = new ProjectSheetService(
      prisma as any,
      auditLogs as unknown as AuditLogsService,
    );
  });

  describe('mapToSheetResponse — sérialisation number JSON', () => {
    it('expose estimatedCost, estimatedGain, roi, priorityScore en number', () => {
      const p = baseProject();
      const dto = service.mapToSheetResponse(p as Project);
      expect(typeof dto.estimatedCost).toBe('number');
      expect(typeof dto.estimatedGain).toBe('number');
      expect(typeof dto.roi).toBe('number');
      expect(typeof dto.priorityScore).toBe('number');
      expect(dto.estimatedCost).toBe(50000);
      expect(dto.estimatedGain).toBe(80000);
    });

    it('dérive riskLevel depuis les risques métier si la fiche est sans niveau', () => {
      const p = baseProject({
        riskLevel: null,
        priorityScore: null,
      });
      const risks = [
        {
          probability: ProjectRiskProbability.HIGH,
          impact: ProjectRiskImpact.HIGH,
          status: ProjectRiskStatus.OPEN,
        },
      ];
      const dto = service.mapToSheetResponse(p as Project, risks as any);
      expect(dto.riskLevel).toBe('HIGH');
      expect(dto.priorityScore).not.toBeNull();
    });
  });

  describe('updateSheet — PATCH partiel recalcule depuis état fusionné', () => {
    it('un seul champ modifié : roi et priorityScore issus du merge complet', async () => {
      const existing = baseProject({
        estimatedGain: new Prisma.Decimal(80000),
        roi: new Prisma.Decimal(0.6),
        priorityScore: new Prisma.Decimal(5),
      });
      prisma.project.findFirst.mockResolvedValue(existing);

      let captured: Record<string, unknown> = {};
      prisma.project.update.mockImplementation(({ data }: { data: Record<string, unknown> }) => {
        captured = data;
        return Promise.resolve({
          ...existing,
          ...data,
          estimatedCost: data.estimatedCost,
          estimatedGain: data.estimatedGain,
          roi: data.roi,
          priorityScore: data.priorityScore,
        });
      });

      await service.updateSheet(
        clientId,
        projectId,
        { estimatedGain: 120000 },
        { actorUserId: 'u1', meta: {} },
      );

      // ROI attendu : (120000 - 50000) / 50000 = 1.4
      expect((captured.roi as Prisma.Decimal).toNumber()).toBeCloseTo(1.4, 5);
      expect(captured.priorityScore).toBeDefined();
      expect(prisma.project.update).toHaveBeenCalled();
    });

    it('persiste swotStrengths et les expose dans la réponse', async () => {
      prisma.project.findFirst.mockResolvedValue(baseProject());
      prisma.project.update.mockImplementation(
        ({ data }: { data: { swotStrengths?: unknown } }) =>
          Promise.resolve({
            ...baseProject(),
            swotStrengths: data.swotStrengths,
          } as Project),
      );

      const res = await service.updateSheet(
        clientId,
        projectId,
        { swotStrengths: ['A', 'B'] },
        { actorUserId: 'u1', meta: {} },
      );

      expect(res.swotStrengths).toEqual(['A', 'B']);
    });
  });

  describe('setArbitrationStatus — journalisation par statut', () => {
    const cases: Array<{
      status: ProjectArbitrationStatus;
      action: string;
    }> = [
      { status: 'DRAFT', action: PROJECT_AUDIT_ACTION.PROJECT_SHEET_UPDATED },
      { status: 'TO_REVIEW', action: PROJECT_AUDIT_ACTION.PROJECT_SHEET_UPDATED },
      { status: 'VALIDATED', action: PROJECT_AUDIT_ACTION.PROJECT_ARBITRATION_VALIDATED },
      { status: 'REJECTED', action: PROJECT_AUDIT_ACTION.PROJECT_ARBITRATION_REJECTED },
    ];

    it.each(cases)('$status → $action', async ({ status, action }) => {
      prisma.project.findFirst.mockResolvedValue(baseProject());
      prisma.project.update.mockImplementation(({ data }: { data: { arbitrationStatus: string } }) =>
        Promise.resolve({
          ...baseProject(),
          arbitrationStatus: data.arbitrationStatus,
        }),
      );

      await service.setArbitrationStatus(
        clientId,
        projectId,
        { status },
        { actorUserId: 'u1', meta: {} },
      );

      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action,
          resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT,
          resourceId: projectId,
        }),
      );
    });
  });
});

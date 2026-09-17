import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ComplianceAssessmentStatus } from '@prisma/client';
import {
  ComplianceService,
  deriveComplianceEvidenceKind,
  evidenceJustifiesCompliance,
} from './compliance.service';
import { ComplianceEvidenceKindDto } from './dto/create-compliance-evidence.dto';

describe('ComplianceService', () => {
  let service: ComplianceService;
  let prisma: any;
  let auditLogs: any;

  beforeEach(() => {
    prisma = {
      complianceFramework: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      complianceRequirement: { findMany: jest.fn(), findFirst: jest.fn() },
      complianceStatus: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      complianceEvidence: {
        groupBy: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
      projectRisk: { count: jest.fn(), groupBy: jest.fn() },
    };
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    service = new ComplianceService(prisma, auditLogs);
  });

  describe('deriveComplianceEvidenceKind / evidenceJustifiesCompliance', () => {
    it('dérive URL / FILE / OBSERVATION', () => {
      expect(
        deriveComplianceEvidenceKind({
          url: 'https://x',
          fileId: null,
          description: null,
        }),
      ).toBe('URL');
      expect(
        deriveComplianceEvidenceKind({
          url: null,
          fileId: 'f1',
          description: null,
        }),
      ).toBe('FILE');
      expect(
        deriveComplianceEvidenceKind({
          url: null,
          fileId: null,
          description: 'vu sur site',
        }),
      ).toBe('OBSERVATION');
    });

    it('justifie conforme avec observation seule', () => {
      expect(
        evidenceJustifiesCompliance({
          url: null,
          fileId: null,
          description: 'constat',
        }),
      ).toBe(true);
      expect(
        evidenceJustifiesCompliance({
          url: null,
          fileId: null,
          description: '  ',
        }),
      ).toBe(false);
    });
  });

  describe('assertEvaluationTransition / upsertStatusForRequirement', () => {
    it('A-04 refuse N/A sans commentaire', async () => {
      await expect(
        service.assertEvaluationTransition('c1', 'req-1', {
          status: ComplianceAssessmentStatus.NOT_APPLICABLE,
          comment: '  ',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('A-02 refuse conforme sans preuve', async () => {
      prisma.complianceEvidence.findMany.mockResolvedValue([]);
      await expect(
        service.assertEvaluationTransition('c1', 'req-1', {
          status: ComplianceAssessmentStatus.COMPLIANT,
          comment: 'OK',
        }),
      ).rejects.toThrow(/preuve/);
    });

    it('A-01 accepte conforme avec commentaire + observation', async () => {
      prisma.complianceEvidence.findMany.mockResolvedValue([
        { url: null, fileId: null, description: 'Revue terrain' },
      ]);
      await expect(
        service.assertEvaluationTransition('c1', 'req-1', {
          status: ComplianceAssessmentStatus.COMPLIANT,
          comment: 'Couverture complète',
        }),
      ).resolves.toBeUndefined();
    });

    it('A-05 refuse upsert si exigence hors client', async () => {
      prisma.complianceRequirement.findFirst.mockResolvedValue(null);
      await expect(
        service.upsertStatusForRequirement('c1', 'req-x', {
          status: ComplianceAssessmentStatus.NON_COMPLIANT,
          comment: 'écart',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('crée le statut si absent (après règles)', async () => {
      prisma.complianceRequirement.findFirst.mockResolvedValue({ id: 'req-1' });
      prisma.complianceStatus.findUnique.mockResolvedValue(null);
      prisma.complianceEvidence.findMany.mockResolvedValue([
        { url: 'https://e', fileId: null, description: null },
      ]);
      prisma.complianceStatus.create.mockResolvedValue({
        id: 'st-1',
        status: ComplianceAssessmentStatus.COMPLIANT,
        requirementId: 'req-1',
      });

      const row = await service.upsertStatusForRequirement('c1', 'req-1', {
        status: ComplianceAssessmentStatus.COMPLIANT,
        comment: 'Validé',
      });

      expect(row.id).toBe('st-1');
      expect(prisma.complianceStatus.create).toHaveBeenCalled();
      expect(auditLogs.create).toHaveBeenCalled();
    });
  });

  describe('createEvidence', () => {
    it('accepte une observation sans URL', async () => {
      prisma.complianceRequirement.findFirst.mockResolvedValue({ id: 'req-1' });
      prisma.complianceEvidence.create.mockResolvedValue({
        id: 'ev-1',
        requirementId: 'req-1',
        name: 'Constat',
        description: 'Vu en atelier',
        url: null,
        fileId: null,
      });

      const row = await service.createEvidence(
        'c1',
        {
          requirementId: 'req-1',
          name: 'Constat',
          description: 'Vu en atelier',
          kind: ComplianceEvidenceKindDto.OBSERVATION,
        },
        'u1',
      );

      expect(row.kind).toBe('OBSERVATION');
      expect(prisma.complianceEvidence.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            description: 'Vu en atelier',
            url: null,
          }),
        }),
      );
    });

    it('refuse observation sans description', async () => {
      await expect(
        service.createEvidence(
          'c1',
          {
            requirementId: 'req-1',
            name: 'X',
            kind: ComplianceEvidenceKindDto.OBSERVATION,
          },
          'u1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('dashboard — dénominateur A', () => {
    it('A-07 : A=0 ⇒ compliancePercent null', async () => {
      prisma.complianceFramework.findMany.mockResolvedValue([{ id: 'fw-1' }]);
      prisma.complianceRequirement.findMany.mockResolvedValue([
        { id: 'r1' },
        { id: 'r2' },
      ]);
      prisma.complianceStatus.findMany.mockResolvedValue([
        { requirementId: 'r1', status: ComplianceAssessmentStatus.NOT_APPLICABLE },
      ]);
      prisma.complianceEvidence.groupBy.mockResolvedValue([]);
      prisma.projectRisk.count.mockResolvedValue(0);

      const dash = await service.dashboard('c1');

      expect(dash.applicableCount).toBe(0);
      expect(dash.notApplicableCount).toBe(1);
      expect(dash.notAssessedRequirementCount).toBe(1);
      expect(dash.compliancePercent).toBeNull();
    });

    it('calcule C/A (conformes / applicables)', async () => {
      prisma.complianceFramework.findMany.mockResolvedValue([{ id: 'fw-1' }]);
      prisma.complianceRequirement.findMany.mockResolvedValue(
        Array.from({ length: 7 }, (_, i) => ({ id: `r${i + 1}` })),
      );
      prisma.complianceStatus.findMany.mockResolvedValue([
        { requirementId: 'r1', status: ComplianceAssessmentStatus.COMPLIANT },
        { requirementId: 'r2', status: ComplianceAssessmentStatus.COMPLIANT },
        { requirementId: 'r3', status: ComplianceAssessmentStatus.NON_COMPLIANT },
        { requirementId: 'r4', status: ComplianceAssessmentStatus.PARTIALLY_COMPLIANT },
        { requirementId: 'r5', status: ComplianceAssessmentStatus.NOT_APPLICABLE },
        { requirementId: 'r6', status: ComplianceAssessmentStatus.NOT_APPLICABLE },
      ]);
      prisma.complianceEvidence.groupBy.mockResolvedValue([]);
      prisma.projectRisk.count.mockResolvedValue(0);

      const dash = await service.dashboard('c1');

      expect(dash.totalRequirementsActiveFrameworks).toBe(7);
      expect(dash.notApplicableCount).toBe(2);
      expect(dash.notAssessedRequirementCount).toBe(1);
      expect(dash.applicableCount).toBe(4);
      expect(dash.compliantCount).toBe(2);
      expect(dash.compliancePercent).toBe(50);
    });
  });

  describe('frameworksSummary', () => {
    it('filtre sur le client demandé', async () => {
      prisma.complianceFramework.findMany.mockResolvedValue([]);

      await service.frameworksSummary('c1');

      expect(prisma.complianceFramework.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { clientId: 'c1', isActive: true } }),
      );
    });

    it('renvoie un tableau vide sans référentiel, sans requête inutile', async () => {
      prisma.complianceFramework.findMany.mockResolvedValue([]);

      const result = await service.frameworksSummary('c1');

      expect(result).toEqual([]);
      expect(prisma.complianceRequirement.findMany).not.toHaveBeenCalled();
      expect(prisma.complianceStatus.findMany).not.toHaveBeenCalled();
    });

    it('ventile les exigences par référentiel et calcule le taux hors N/A', async () => {
      prisma.complianceFramework.findMany.mockResolvedValue([
        { id: 'fw-1', name: 'RGPD', version: '2016/679', isActive: true, nextAuditAt: null },
        { id: 'fw-2', name: 'DORA', version: '2022/2554', isActive: true, nextAuditAt: null },
      ]);
      prisma.complianceRequirement.findMany.mockResolvedValue([
        { id: 'r1', frameworkId: 'fw-1' },
        { id: 'r2', frameworkId: 'fw-1' },
        { id: 'r3', frameworkId: 'fw-1' },
        { id: 'r4', frameworkId: 'fw-1' },
        { id: 'r5', frameworkId: 'fw-2' },
      ]);
      prisma.complianceStatus.findMany.mockResolvedValue([
        { requirementId: 'r1', status: ComplianceAssessmentStatus.COMPLIANT },
        { requirementId: 'r2', status: ComplianceAssessmentStatus.COMPLIANT },
        { requirementId: 'r3', status: ComplianceAssessmentStatus.NON_COMPLIANT },
        { requirementId: 'r4', status: ComplianceAssessmentStatus.NOT_APPLICABLE },
      ]);

      const [rgpd, dora] = await service.frameworksSummary('c1');

      expect(rgpd.requirementCount).toBe(4);
      expect(rgpd.compliantCount).toBe(2);
      expect(rgpd.nonCompliantCount).toBe(1);
      expect(rgpd.notApplicableCount).toBe(1);
      expect(rgpd.notAssessedCount).toBe(0);
      expect(rgpd.evaluatedCount).toBe(3);
      expect(rgpd.compliancePercent).toBe(67);

      expect(dora.requirementCount).toBe(1);
      expect(dora.notAssessedCount).toBe(1);
      expect(dora.evaluatedCount).toBe(0);
      expect(dora.compliancePercent).toBeNull();
    });

    it('compte les partiellement conformes au dénominateur mais pas au numérateur', async () => {
      prisma.complianceFramework.findMany.mockResolvedValue([
        { id: 'fw-1', name: 'ISO 27001', version: '2022', isActive: true, nextAuditAt: null },
      ]);
      prisma.complianceRequirement.findMany.mockResolvedValue([
        { id: 'r1', frameworkId: 'fw-1' },
        { id: 'r2', frameworkId: 'fw-1' },
      ]);
      prisma.complianceStatus.findMany.mockResolvedValue([
        { requirementId: 'r1', status: ComplianceAssessmentStatus.COMPLIANT },
        { requirementId: 'r2', status: ComplianceAssessmentStatus.PARTIALLY_COMPLIANT },
      ]);

      const [iso] = await service.frameworksSummary('c1');

      expect(iso.partiallyCompliantCount).toBe(1);
      expect(iso.evaluatedCount).toBe(2);
      expect(iso.compliancePercent).toBe(50);
    });

    it('remonte l’échéance d’audit du référentiel', async () => {
      const nextAuditAt = new Date('2026-11-30T00:00:00.000Z');
      prisma.complianceFramework.findMany.mockResolvedValue([
        { id: 'fw-1', name: 'RGPD', version: '2016/679', isActive: true, nextAuditAt },
      ]);
      prisma.complianceRequirement.findMany.mockResolvedValue([]);
      prisma.complianceStatus.findMany.mockResolvedValue([]);

      const [rgpd] = await service.frameworksSummary('c1');

      expect(rgpd.nextAuditAt).toBe(nextAuditAt);
      expect(rgpd.requirementCount).toBe(0);
      expect(rgpd.compliancePercent).toBeNull();
    });

    it('ne lit les statuts que du client courant', async () => {
      prisma.complianceFramework.findMany.mockResolvedValue([
        { id: 'fw-1', name: 'RGPD', version: '1', isActive: true, nextAuditAt: null },
      ]);
      prisma.complianceRequirement.findMany.mockResolvedValue([{ id: 'r1', frameworkId: 'fw-1' }]);
      prisma.complianceStatus.findMany.mockResolvedValue([]);

      await service.frameworksSummary('c1');

      expect(prisma.complianceStatus.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ clientId: 'c1', requirementId: { in: ['r1'] } }),
        }),
      );
    });
  });

  describe('getFrameworkOverview', () => {
    it('refuse un référentiel hors client', async () => {
      prisma.complianceFramework.findFirst.mockResolvedValue(null);
      await expect(service.getFrameworkOverview('c1', 'fw-x')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('groupe par category et calcule C/A + remédiation', async () => {
      prisma.complianceFramework.findFirst.mockResolvedValue({
        id: 'fw-1',
        name: 'ISO',
        version: '2022',
        isActive: true,
        nextAuditAt: null,
      });
      prisma.complianceRequirement.findMany.mockResolvedValue([
        { id: 'r1', code: 'A.5.1', title: 'Pol', category: 'Org', sortOrder: 0 },
        { id: 'r2', code: 'A.5.2', title: 'Rôles', category: 'Org', sortOrder: 1 },
        { id: 'r3', code: 'A.8.1', title: 'Tech', category: 'Tech', sortOrder: 0 },
        { id: 'r4', code: 'X.1', title: 'Misc', category: null, sortOrder: 0 },
      ]);
      prisma.complianceStatus.findMany.mockResolvedValue([
        { requirementId: 'r1', status: ComplianceAssessmentStatus.COMPLIANT },
        { requirementId: 'r2', status: ComplianceAssessmentStatus.NON_COMPLIANT },
        { requirementId: 'r3', status: ComplianceAssessmentStatus.PARTIALLY_COMPLIANT },
      ]);
      prisma.complianceEvidence.groupBy.mockResolvedValue([
        { requirementId: 'r1', _count: { _all: 2 } },
      ]);
      prisma.projectRisk.groupBy.mockResolvedValue([
        { complianceRequirementId: 'r2', _count: { _all: 1 } },
      ]);

      const ov = await service.getFrameworkOverview('c1', 'fw-1');

      expect(ov.requirementCount).toBe(4);
      expect(ov.applicableCount).toBe(3);
      expect(ov.compliantCount).toBe(1);
      expect(ov.compliancePercent).toBe(33);
      expect(ov.domains.map((d) => d.label)).toEqual(['Org', 'Tech', 'Sans domaine']);
      expect(ov.remediation.map((r) => r.code)).toEqual(['A.5.2', 'A.8.1']);
      expect(ov.requirements.find((r) => r.id === 'r1')?.evidenceCount).toBe(2);
      expect(ov.requirements.find((r) => r.id === 'r2')?.linkedRiskCount).toBe(1);
      expect(ov.requirements.find((r) => r.id === 'r4')?.status).toBe('NOT_ASSESSED');
    });

    it('A=0 ⇒ compliancePercent null', async () => {
      prisma.complianceFramework.findFirst.mockResolvedValue({
        id: 'fw-1',
        name: 'ISO',
        version: '2022',
        isActive: true,
        nextAuditAt: null,
      });
      prisma.complianceRequirement.findMany.mockResolvedValue([
        { id: 'r1', code: 'A', title: 'T', category: 'D', sortOrder: 0 },
      ]);
      prisma.complianceStatus.findMany.mockResolvedValue([
        { requirementId: 'r1', status: ComplianceAssessmentStatus.NOT_APPLICABLE },
      ]);
      prisma.complianceEvidence.groupBy.mockResolvedValue([]);
      prisma.projectRisk.groupBy.mockResolvedValue([]);

      const ov = await service.getFrameworkOverview('c1', 'fw-1');
      expect(ov.applicableCount).toBe(0);
      expect(ov.compliancePercent).toBeNull();
      expect(ov.remediation).toEqual([]);
    });
  });

  describe('setClientFrameworkActive', () => {
    it('désactive une instance client et audite', async () => {
      prisma.complianceFramework.findFirst.mockResolvedValue({
        id: 'fw-1',
        clientId: 'c1',
        name: 'RGPD',
        version: '1',
        isActive: true,
      });
      prisma.complianceFramework.update.mockResolvedValue({
        id: 'fw-1',
        clientId: 'c1',
        name: 'RGPD',
        version: '1',
        isActive: false,
      });

      const out = await service.setClientFrameworkActive('c1', 'fw-1', false, {
        actorUserId: 'u1',
      });

      expect(out.isActive).toBe(false);
      expect(prisma.complianceFramework.update).toHaveBeenCalledWith({
        where: { id: 'fw-1' },
        data: { isActive: false },
      });
      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: 'c1',
          resourceId: 'fw-1',
          oldValue: expect.objectContaining({ isActive: true }),
          newValue: expect.objectContaining({ isActive: false }),
        }),
      );
    });

    it('refuse un référentiel hors client', async () => {
      prisma.complianceFramework.findFirst.mockResolvedValue(null);
      await expect(
        service.setClientFrameworkActive('c1', 'fw-x', false),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('idempotent si déjà dans l’état demandé', async () => {
      const row = {
        id: 'fw-1',
        clientId: 'c1',
        name: 'RGPD',
        version: '1',
        isActive: false,
      };
      prisma.complianceFramework.findFirst.mockResolvedValue(row);
      const out = await service.setClientFrameworkActive('c1', 'fw-1', false);
      expect(out).toBe(row);
      expect(prisma.complianceFramework.update).not.toHaveBeenCalled();
    });
  });

  describe('activatePlatformFrameworkForClient', () => {
    it('réactive une instance inactive sans recopier', async () => {
      prisma.complianceFramework.findFirst
        .mockResolvedValueOnce({
          id: 'plat-1',
          clientId: null,
          name: 'ISO 27001',
          version: '2022',
          isActive: true,
          archivedAt: null,
          requirements: [{ code: 'A.1', title: 'T' }],
        })
        .mockResolvedValueOnce({
          id: 'fw-client',
          clientId: 'c1',
          name: 'ISO 27001',
          version: '2022',
          isActive: false,
        })
        .mockResolvedValueOnce({
          id: 'fw-client',
          clientId: 'c1',
          name: 'ISO 27001',
          version: '2022',
          isActive: false,
        });
      prisma.complianceFramework.update.mockResolvedValue({
        id: 'fw-client',
        clientId: 'c1',
        name: 'ISO 27001',
        version: '2022',
        isActive: true,
      });

      const out = await service.activatePlatformFrameworkForClient(
        'c1',
        'plat-1',
        { actorUserId: 'u1' },
      );

      expect(out.isActive).toBe(true);
      expect(prisma.complianceFramework.update).toHaveBeenCalledWith({
        where: { id: 'fw-client' },
        data: { isActive: true },
      });
    });
  });
});

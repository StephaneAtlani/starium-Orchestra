import { ComplianceAssessmentStatus } from '@prisma/client';
import { ComplianceService } from './compliance.service';

describe('ComplianceService', () => {
  let service: ComplianceService;
  let prisma: any;
  let auditLogs: any;

  beforeEach(() => {
    prisma = {
      complianceFramework: { findMany: jest.fn(), create: jest.fn() },
      complianceRequirement: { findMany: jest.fn() },
      complianceStatus: { findMany: jest.fn() },
      complianceEvidence: { groupBy: jest.fn() },
      projectRisk: { count: jest.fn() },
    };
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    service = new ComplianceService(prisma, auditLogs);
  });

  describe('frameworksSummary', () => {
    it('filtre sur le client demandé', async () => {
      prisma.complianceFramework.findMany.mockResolvedValue([]);

      await service.frameworksSummary('c1');

      expect(prisma.complianceFramework.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { clientId: 'c1' } }),
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
        // N/A : exclu du dénominateur.
        { requirementId: 'r4', status: ComplianceAssessmentStatus.NOT_APPLICABLE },
        // r5 sans statut : non évalué.
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
});

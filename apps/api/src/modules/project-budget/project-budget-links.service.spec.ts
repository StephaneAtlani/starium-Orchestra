import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma, ProjectBudgetAllocationType } from '@prisma/client';
import { ProjectBudgetLinksService } from './project-budget-links.service';

describe('ProjectBudgetLinksService', () => {
  let service: ProjectBudgetLinksService;

  beforeEach(() => {
    service = new ProjectBudgetLinksService(
      {} as never,
      { create: jest.fn() } as never,
      { getProjectForScope: jest.fn() } as never,
    );
  });

  describe('validateProjectLinksInvariant', () => {
    it('0 lien : valide', () => {
      expect(() => service.validateProjectLinksInvariant([])).not.toThrow();
    });

    it('PERCENTAGE 50 + 50 : valide', () => {
      expect(() =>
        service.validateProjectLinksInvariant([
          {
            allocationType: ProjectBudgetAllocationType.PERCENTAGE,
            percentage: new Prisma.Decimal(50),
            amount: null,
          },
          {
            allocationType: ProjectBudgetAllocationType.PERCENTAGE,
            percentage: new Prisma.Decimal(50),
            amount: null,
          },
        ]),
      ).not.toThrow();
    });

    it('PERCENTAGE 40 + 40 : valide (somme < 100, complétable plus tard)', () => {
      expect(() =>
        service.validateProjectLinksInvariant([
          {
            allocationType: ProjectBudgetAllocationType.PERCENTAGE,
            percentage: new Prisma.Decimal(40),
            amount: null,
          },
          {
            allocationType: ProjectBudgetAllocationType.PERCENTAGE,
            percentage: new Prisma.Decimal(40),
            amount: null,
          },
        ]),
      ).not.toThrow();
    });

    it('PERCENTAGE 60 + 50 : BadRequest (somme > 100)', () => {
      expect(() =>
        service.validateProjectLinksInvariant([
          {
            allocationType: ProjectBudgetAllocationType.PERCENTAGE,
            percentage: new Prisma.Decimal(60),
            amount: null,
          },
          {
            allocationType: ProjectBudgetAllocationType.PERCENTAGE,
            percentage: new Prisma.Decimal(50),
            amount: null,
          },
        ]),
      ).toThrow(BadRequestException);
    });

    it('mélange FULL et PERCENTAGE : BadRequest', () => {
      expect(() =>
        service.validateProjectLinksInvariant([
          {
            allocationType: ProjectBudgetAllocationType.FULL,
            percentage: null,
            amount: null,
          },
          {
            allocationType: ProjectBudgetAllocationType.PERCENTAGE,
            percentage: new Prisma.Decimal(100),
            amount: null,
          },
        ]),
      ).toThrow(BadRequestException);
    });

    it('FULL > 1 : BadRequest', () => {
      expect(() =>
        service.validateProjectLinksInvariant([
          {
            allocationType: ProjectBudgetAllocationType.FULL,
            percentage: null,
            amount: null,
          },
          {
            allocationType: ProjectBudgetAllocationType.FULL,
            percentage: null,
            amount: null,
          },
        ]),
      ).toThrow(BadRequestException);
    });

    it('FIXED avec montant ≤ 0 : BadRequest', () => {
      expect(() =>
        service.validateProjectLinksInvariant([
          {
            allocationType: ProjectBudgetAllocationType.FIXED,
            percentage: null,
            amount: new Prisma.Decimal(0),
          },
        ]),
      ).toThrow(BadRequestException);
    });

    it('FIXED deux montants positifs : valide', () => {
      expect(() =>
        service.validateProjectLinksInvariant([
          {
            allocationType: ProjectBudgetAllocationType.FIXED,
            percentage: null,
            amount: new Prisma.Decimal(10),
          },
          {
            allocationType: ProjectBudgetAllocationType.FIXED,
            percentage: null,
            amount: new Prisma.Decimal(20.5),
          },
        ]),
      ).not.toThrow();
    });
  });

  describe('remove', () => {
    it('supprime un lien PERCENTAGE : succès si le résidu reste ≤ 100 % (ex. 50+50 → 50)', async () => {
      const linkA = {
        id: 'link-a',
        clientId: 'client-1',
        projectId: 'proj-1',
        budgetLineId: 'bl-1',
        allocationType: ProjectBudgetAllocationType.PERCENTAGE,
        percentage: new Prisma.Decimal(50),
        amount: null,
      };
      const linkB = {
        id: 'link-b',
        clientId: 'client-1',
        projectId: 'proj-1',
        budgetLineId: 'bl-2',
        allocationType: ProjectBudgetAllocationType.PERCENTAGE,
        percentage: new Prisma.Decimal(50),
        amount: null,
      };

      const tx = {
        projectBudgetLink: {
          findMany: jest.fn().mockResolvedValue([linkA, linkB]),
          delete: jest.fn().mockResolvedValue({}),
        },
      };

      const prisma = {
        projectBudgetLink: {
          findFirst: jest.fn().mockResolvedValue(linkA),
        },
        $transaction: jest.fn(async (fn: (t: typeof tx) => Promise<void>) =>
          fn(tx),
        ),
      };

      const svc = new ProjectBudgetLinksService(
        prisma as never,
        { create: jest.fn() } as never,
        { getProjectForScope: jest.fn() } as never,
      );

      await svc.remove('client-1', 'link-a', undefined);
      expect(tx.projectBudgetLink.delete).toHaveBeenCalledWith({
        where: { id: 'link-a' },
      });
    });
  });

  describe('listByBudgetLine', () => {
    it('ligne hors client → NotFound', async () => {
      const prisma = {
        budgetLine: { findFirst: jest.fn().mockResolvedValue(null) },
      };
      const svc = new ProjectBudgetLinksService(
        prisma as never,
        { create: jest.fn() } as never,
        { getProjectForScope: jest.fn() } as never,
      );
      await expect(
        svc.listByBudgetLine('client-1', 'line-x', {}),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('liste vide', async () => {
      const prisma = {
        budgetLine: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'line-1',
            code: 'L1',
            name: 'Ligne',
            budgetId: 'bud-1',
            committedAmount: new Prisma.Decimal(0),
            consumedAmount: new Prisma.Decimal(0),
            initialAmount: new Prisma.Decimal(1000),
          }),
          groupBy: jest.fn().mockResolvedValue([
            {
              budgetId: 'bud-1',
              _sum: { initialAmount: new Prisma.Decimal(1000) },
            },
          ]),
        },
        projectBudgetLink: {
          count: jest.fn().mockResolvedValue(0),
          findMany: jest.fn().mockResolvedValue([]),
        },
      };
      const svc = new ProjectBudgetLinksService(
        prisma as never,
        { create: jest.fn() } as never,
        { getProjectForScope: jest.fn() } as never,
      );
      const res = await svc.listByBudgetLine('client-1', 'line-1', {});
      expect(res.total).toBe(0);
      expect(res.items).toEqual([]);
      expect(res.imputationBasis).toBe('PROPORTIONAL_V1');
    });

    it('2 projets FIXED + PERCENTAGE', async () => {
      const prisma = {
        budgetLine: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'line-1',
            code: 'L1',
            name: 'Ligne',
            budgetId: 'bud-1',
            committedAmount: new Prisma.Decimal(4000),
            consumedAmount: new Prisma.Decimal(2000),
            initialAmount: new Prisma.Decimal(10000),
          }),
          groupBy: jest.fn().mockResolvedValue([
            {
              budgetId: 'bud-1',
              _sum: { initialAmount: new Prisma.Decimal(100000) },
            },
          ]),
        },
        projectBudgetLink: {
          count: jest.fn().mockResolvedValue(2),
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'link-1',
              allocationType: ProjectBudgetAllocationType.FIXED,
              percentage: null,
              amount: new Prisma.Decimal(1500),
              project: {
                id: 'p1',
                code: 'P1',
                name: 'Projet Un',
                status: 'IN_PROGRESS',
              },
            },
            {
              id: 'link-2',
              allocationType: ProjectBudgetAllocationType.PERCENTAGE,
              percentage: new Prisma.Decimal(25),
              amount: null,
              project: {
                id: 'p2',
                code: 'P2',
                name: 'Projet Deux',
                status: 'DRAFT',
              },
            },
          ]),
        },
      };
      const svc = new ProjectBudgetLinksService(
        prisma as never,
        { create: jest.fn() } as never,
        { getProjectForScope: jest.fn() } as never,
      );
      const res = await svc.listByBudgetLine('client-1', 'line-1', {
        limit: 20,
        offset: 0,
      });
      expect(res.total).toBe(2);
      expect(res.items).toHaveLength(2);
      expect(res.items[0]!.projectAllocatedAmount).toBe(1500);
      expect(res.items[0]!.imputedConsumedAmount).toBe(1500);
      expect(res.items[1]!.projectAllocatedAmount).toBe(2500);
      expect(res.items[1]!.imputedConsumedAmount).toBe(500);
      expect(res.items[1]!.project.name).toBe('Projet Deux');
    });
  });

  describe('getProjectBudgetKpis', () => {
    it('budget hors client → NotFound', async () => {
      const prisma = {
        budget: { findFirst: jest.fn().mockResolvedValue(null) },
      };
      const svc = new ProjectBudgetLinksService(
        prisma as never,
        { create: jest.fn() } as never,
        { getProjectForScope: jest.fn() } as never,
      );
      await expect(
        svc.getProjectBudgetKpis('client-1', 'bud-x'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('agrège FIXED + PERCENTAGE et calcule drift', async () => {
      const prisma = {
        budget: { findFirst: jest.fn().mockResolvedValue({ id: 'bud-1' }) },
        budgetLine: {
          groupBy: jest.fn().mockResolvedValue([
            {
              budgetId: 'bud-1',
              _sum: { initialAmount: new Prisma.Decimal(10000) },
            },
          ]),
        },
        projectBudgetLink: {
          findMany: jest.fn().mockResolvedValue([
            {
              projectId: 'p1',
              allocationType: ProjectBudgetAllocationType.FIXED,
              percentage: null,
              amount: new Prisma.Decimal(1000),
              project: {
                id: 'p1',
                code: 'P1',
                name: 'Alpha',
                status: 'IN_PROGRESS',
              },
              budgetLine: {
                initialAmount: new Prisma.Decimal(10000),
                committedAmount: new Prisma.Decimal(500),
                consumedAmount: new Prisma.Decimal(2000),
              },
            },
            {
              projectId: 'p1',
              allocationType: ProjectBudgetAllocationType.FIXED,
              percentage: null,
              amount: new Prisma.Decimal(500),
              project: {
                id: 'p1',
                code: 'P1',
                name: 'Alpha',
                status: 'IN_PROGRESS',
              },
              budgetLine: {
                initialAmount: new Prisma.Decimal(5000),
                committedAmount: new Prisma.Decimal(100),
                consumedAmount: new Prisma.Decimal(100),
              },
            },
            {
              projectId: 'p2',
              allocationType: ProjectBudgetAllocationType.PERCENTAGE,
              percentage: new Prisma.Decimal(50),
              amount: null,
              project: {
                id: 'p2',
                code: 'P2',
                name: 'Beta',
                status: 'DRAFT',
              },
              budgetLine: {
                initialAmount: new Prisma.Decimal(10000),
                committedAmount: new Prisma.Decimal(0),
                consumedAmount: new Prisma.Decimal(0),
              },
            },
          ]),
        },
      };
      const svc = new ProjectBudgetLinksService(
        prisma as never,
        { create: jest.fn() } as never,
        { getProjectForScope: jest.fn() } as never,
      );
      const res = await svc.getProjectBudgetKpis('client-1', 'bud-1');
      expect(res.imputationBasis).toBe('PROPORTIONAL_V1');
      expect(res.totals.projectCount).toBe(2);
      const alpha = res.items.find((i) => i.projectId === 'p1');
      expect(alpha!.targetAmount).toBe(1500);
      // FIXED min: min(1000,2000)+min(500,100) = 1000+100 = 1100 consumed
      expect(alpha!.consumedAmount).toBe(1100);
      expect(alpha!.driftAmount).toBe(1100 - 1500);
      expect(alpha!.linkCount).toBe(2);
      const beta = res.items.find((i) => i.projectId === 'p2');
      expect(beta!.targetAmount).toBe(5000);
      expect(beta!.consumedAmount).toBe(0);
    });
  });
});


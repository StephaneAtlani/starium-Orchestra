import { BadRequestException } from '@nestjs/common';
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
});


import { BadRequestException, ConflictException } from '@nestjs/common';
import { ProjectPortfolioCategoriesService } from './project-portfolio-categories.service';

describe('ProjectPortfolioCategoriesService', () => {
  let service: ProjectPortfolioCategoriesService;
  let prisma: any;
  let auditLogs: { create: jest.Mock };
  const clientId = 'client-1';

  beforeEach(() => {
    prisma = {
      projectPortfolioCategory: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        delete: jest.fn(),
      },
      project: { count: jest.fn() },
      $transaction: jest.fn(async (ops: Array<Promise<unknown>>) => Promise.all(ops)),
    };
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    service = new ProjectPortfolioCategoriesService(prisma, auditLogs as any);
  });

  it('refuse une sous-categorie sur parent non-racine', async () => {
    prisma.projectPortfolioCategory.findFirst.mockResolvedValue({
      id: 'p1',
      clientId,
      parentId: 'root',
    });
    await expect(
      service.create(clientId, { name: 'Sous', parentId: 'p1' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('refuse un doublon normalise sous meme parent', async () => {
    prisma.projectPortfolioCategory.findFirst.mockResolvedValue({ id: 'existing' });
    await expect(
      service.create(clientId, { name: ' Infrastructure ' }),
    ).rejects.toThrow(ConflictException);
  });

  it('refuse suppression si enfants', async () => {
    prisma.projectPortfolioCategory.findFirst.mockResolvedValue({
      id: 'c1',
      clientId,
      name: 'Infra',
      parentId: null,
    });
    prisma.projectPortfolioCategory.count.mockResolvedValueOnce(1);
    prisma.project.count.mockResolvedValueOnce(0);
    await expect(service.remove(clientId, 'c1')).rejects.toThrow(BadRequestException);
  });

  it('refuse suppression si projets rattaches', async () => {
    prisma.projectPortfolioCategory.findFirst.mockResolvedValue({
      id: 'c1',
      clientId,
      name: 'Infra',
      parentId: 'r1',
    });
    prisma.projectPortfolioCategory.count.mockResolvedValueOnce(0);
    prisma.project.count.mockResolvedValueOnce(2);
    await expect(service.remove(clientId, 'c1')).rejects.toThrow(BadRequestException);
  });

  it('reorder refuse categories de parents differents', async () => {
    prisma.projectPortfolioCategory.findMany.mockResolvedValue([
      { id: 'a', parentId: null },
      { id: 'b', parentId: 'p1' },
    ]);
    await expect(
      service.reorder(clientId, {
        parentId: null,
        items: [
          { id: 'a', sortOrder: 0 },
          { id: 'b', sortOrder: 1 },
        ],
      }),
    ).rejects.toThrow(BadRequestException);
  });
});

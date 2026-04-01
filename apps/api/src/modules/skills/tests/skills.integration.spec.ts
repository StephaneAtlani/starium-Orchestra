import { Test } from '@nestjs/testing';
import { SkillStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { SkillsService } from '../skills.service';

describe('Skills integration (module-scoped)', () => {
  let service: SkillsService;
  let prisma: any;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SkillsService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn(async (ops: Array<Promise<unknown>>) => Promise.all(ops)),
            skill: {
              count: jest.fn().mockResolvedValue(0),
              findMany: jest.fn().mockResolvedValue([]),
              findFirst: jest.fn(),
            },
            skillCategory: {
              count: jest.fn().mockResolvedValue(0),
              findMany: jest.fn().mockResolvedValue([]),
            },
          },
        },
        { provide: AuditLogsService, useValue: { create: jest.fn() } },
      ],
    }).compile();
    service = module.get(SkillsService);
    prisma = module.get(PrismaService);
  });

  it('isole les lectures skills au client actif', async () => {
    await service.listSkills('client-A', { offset: 0, limit: 20 });
    expect(prisma.skill.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ clientId: 'client-A' }),
      }),
    );
  });

  it('isole les lectures categories au client actif', async () => {
    await service.listSkillCategories('client-A', { offset: 0, limit: 20 });
    expect(prisma.skillCategory.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ clientId: 'client-A' }),
      }),
    );
  });

  it('contrat liste skills retourne { items, total, limit, offset }', async () => {
    const out = await service.listSkills('client-A', {
      offset: 0,
      limit: 20,
      status: [SkillStatus.ACTIVE],
    });
    expect(out).toHaveProperty('items');
    expect(out).toHaveProperty('total');
    expect(out).toHaveProperty('limit', 20);
    expect(out).toHaveProperty('offset', 0);
  });
});

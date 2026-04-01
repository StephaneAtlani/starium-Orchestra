import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SkillReferenceLevel, SkillStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { SkillsService } from './skills.service';

describe('SkillsService', () => {
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
              create: jest.fn(),
              update: jest.fn(),
            },
            skillCategory: {
              findFirst: jest.fn(),
              findMany: jest.fn().mockResolvedValue([]),
              count: jest.fn().mockResolvedValue(0),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
        { provide: AuditLogsService, useValue: { create: jest.fn() } },
      ],
    }).compile();
    service = module.get(SkillsService);
    prisma = module.get(PrismaService);
  });

  it('liste skills: exclut ARCHIVED par défaut', async () => {
    await service.listSkills('client-A', { offset: 0, limit: 20 });
    expect(prisma.skill.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clientId: 'client-A',
          status: { in: [SkillStatus.ACTIVE, SkillStatus.DRAFT] },
        }),
      }),
    );
  });

  it('liste skills: includeArchived=true ne force pas le filtre status par défaut', async () => {
    await service.listSkills('client-A', { includeArchived: true, offset: 0, limit: 20 });
    const call = prisma.skill.count.mock.calls[0][0];
    expect(call.where.clientId).toBe('client-A');
    expect(call.where.status).toBeUndefined();
  });

  it('options skills: n inclut jamais ARCHIVED', async () => {
    await service.listSkillOptions('client-A', { offset: 0, limit: 50 });
    expect(prisma.skill.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: [SkillStatus.ACTIVE, SkillStatus.DRAFT] },
        }),
      }),
    );
  });

  it('archive idempotent: ARCHIVED -> ARCHIVED retourne tel quel', async () => {
    prisma.skill.findFirst.mockResolvedValue({
      id: 'skill-1',
      clientId: 'client-A',
      categoryId: 'cat-1',
      category: { name: 'Cat' },
      name: 'Kubernetes',
      description: null,
      status: SkillStatus.ARCHIVED,
      referenceLevel: SkillReferenceLevel.ADVANCED,
      archivedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const out = await service.archiveSkill('client-A', 'skill-1');
    expect(prisma.skill.update).not.toHaveBeenCalled();
    expect(out.status).toBe(SkillStatus.ARCHIVED);
  });

  it('restore idempotent: non-ARCHIVED retourne tel quel', async () => {
    prisma.skill.findFirst.mockResolvedValue({
      id: 'skill-1',
      clientId: 'client-A',
      categoryId: 'cat-1',
      category: { name: 'Cat' },
      name: 'Kubernetes',
      description: null,
      status: SkillStatus.ACTIVE,
      referenceLevel: SkillReferenceLevel.ADVANCED,
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const out = await service.restoreSkill('client-A', 'skill-1');
    expect(prisma.skill.update).not.toHaveBeenCalled();
    expect(out.status).toBe(SkillStatus.ACTIVE);
  });

  it('unicité skills: collision normalizedName -> ConflictException', async () => {
    prisma.skillCategory.findFirst.mockResolvedValue({ id: 'cat-1' });
    prisma.skill.findFirst.mockResolvedValue({ id: 'skill-existing' });
    await expect(
      service.createSkill('client-A', {
        name: '  KUBERNETES  ',
        categoryId: 'cat-1',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('unicité catégories: collision normalizedName -> ConflictException', async () => {
    prisma.skillCategory.findFirst.mockResolvedValue({ id: 'cat-existing' });
    await expect(
      service.createSkillCategory('client-A', {
        name: '  Infrastructure  ',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

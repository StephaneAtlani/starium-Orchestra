import { Test } from '@nestjs/testing';
import { CollaboratorSkillSource, SkillReferenceLevel } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { CollaboratorSkillsService } from '../collaborator-skills.service';

describe('CollaboratorSkills integration (module-scoped)', () => {
  let service: CollaboratorSkillsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(async (ops: Array<Promise<unknown>>) =>
        Promise.all(ops),
      ),
      collaborator: { findFirst: jest.fn().mockResolvedValue({ id: 'c' }) },
      collaboratorSkill: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
      skill: { findFirst: jest.fn() },
    };

    const module = await Test.createTestingModule({
      providers: [
        CollaboratorSkillsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: { create: jest.fn() } },
      ],
    }).compile();

    service = module.get(CollaboratorSkillsService);
  });

  it('contrat liste par collaborateur = { items, total, limit, offset }', async () => {
    const out = await service.listByCollaborator('client-A', 'col-1', {
      offset: 0,
      limit: 20,
    });
    expect(out).toHaveProperty('items');
    expect(out).toHaveProperty('total');
    expect(out).toHaveProperty('limit', 20);
    expect(out).toHaveProperty('offset', 0);
  });

  it('isole les requêtes au clientId actif (count)', async () => {
    await service.listByCollaborator('client-A', 'col-1', {
      offset: 0,
      limit: 20,
      level: [SkillReferenceLevel.BEGINNER],
      source: [CollaboratorSkillSource.SELF_DECLARED],
    });
    expect(prisma.collaboratorSkill.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ clientId: 'client-A' }),
      }),
    );
  });
});

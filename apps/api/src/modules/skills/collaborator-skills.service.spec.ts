import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  CollaboratorSkillSource,
  CollaboratorStatus,
  SkillReferenceLevel,
  SkillStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CollaboratorSkillsService } from './collaborator-skills.service';
import {
  CollaboratorSkillListSortBy,
  CollaboratorSkillSortOrder,
} from './dto/list-collaborator-skills.query.dto';

describe('CollaboratorSkillsService', () => {
  let service: CollaboratorSkillsService;
  let prisma: {
    collaborator: {
      findFirst: jest.Mock;
    };
    collaboratorSkill: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
    skill: { findFirst: jest.Mock; findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let auditCreate: jest.Mock;

  const clientId = 'c1';
  const collaboratorId = 'col1';
  const skillId = 'sk1';

  const mockSkill = {
    id: skillId,
    clientId,
    categoryId: 'cat1',
    name: 'K8s',
    normalizedName: 'k8s',
    description: null,
    referenceLevel: SkillReferenceLevel.ADVANCED,
    status: SkillStatus.ACTIVE,
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCategory = { id: 'cat1', name: 'Infra' };

  const baseRow = {
    id: 'cs1',
    clientId,
    collaboratorId,
    skillId,
    level: SkillReferenceLevel.BEGINNER,
    source: CollaboratorSkillSource.SELF_DECLARED,
    comment: null,
    reviewedAt: null,
    validatedByUserId: null,
    validatedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    skill: {
      ...mockSkill,
      category: mockCategory,
    },
    validatedBy: null,
  };

  beforeEach(() => {
    auditCreate = jest.fn();
    prisma = {
      collaborator: { findFirst: jest.fn() },
      collaboratorSkill: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      skill: { findFirst: jest.fn(), findMany: jest.fn() },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(async (arg: unknown) => {
      if (typeof arg === 'function') {
        return (arg as (tx: any) => Promise<unknown>)({
          collaboratorSkill: {
            create: prisma.collaboratorSkill.create,
          },
        });
      }
      return Promise.all(arg as Array<Promise<unknown>>);
    });

    service = new CollaboratorSkillsService(
      prisma as unknown as PrismaService,
      { create: auditCreate } as unknown as AuditLogsService,
    );
  });

  describe('create', () => {
    it('409 si association déjà existante', async () => {
      prisma.collaborator.findFirst.mockResolvedValue({
        id: collaboratorId,
        status: CollaboratorStatus.ACTIVE,
      });
      prisma.skill.findFirst.mockResolvedValue(mockSkill);
      prisma.collaboratorSkill.findFirst.mockResolvedValue({ id: 'x' });

      await expect(
        service.create(
          clientId,
          collaboratorId,
          { skillId },
          'u1',
          undefined,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('bulkCreate', () => {
    it('400 si doublon skillId dans le body', async () => {
      prisma.collaborator.findFirst.mockResolvedValue({
        id: collaboratorId,
        status: CollaboratorStatus.ACTIVE,
      });

      await expect(
        service.bulkCreate(
          clientId,
          collaboratorId,
          {
            items: [
              { skillId: 'a' },
              { skillId: 'a' },
            ],
          },
          'u1',
          undefined,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('retourne created, skipped, totalRequested', async () => {
      prisma.collaborator.findFirst.mockResolvedValue({
        id: collaboratorId,
        status: CollaboratorStatus.ACTIVE,
      });
      prisma.skill.findMany.mockResolvedValue([
        mockSkill,
        { ...mockSkill, id: 'sk2', normalizedName: 'x', name: 'X' },
      ]);
      prisma.collaboratorSkill.findMany.mockResolvedValue([
        { skillId },
      ]);
      prisma.collaboratorSkill.create.mockImplementation((args: { data: { skillId: string } }) =>
        Promise.resolve({
          ...baseRow,
          id: 'new',
          skillId: args.data.skillId,
          skill: {
            ...mockSkill,
            id: args.data.skillId,
            category: mockCategory,
          },
        }),
      );

      const out = await service.bulkCreate(
        clientId,
        collaboratorId,
        {
          items: [{ skillId }, { skillId: 'sk2' }],
        },
        'u1',
        undefined,
      );

      expect(out.totalRequested).toBe(2);
      expect(out.skipped).toEqual([
        { skillId, reason: 'already_associated' },
      ]);
      expect(out.created).toHaveLength(1);
      expect(out.created[0].skillId).toBe('sk2');
    });
  });

  describe('validate / invalidate', () => {
    it('validate met à jour validatedAt', async () => {
      prisma.collaboratorSkill.findFirst.mockResolvedValue({
        id: 'cs1',
        skillId,
        level: SkillReferenceLevel.BEGINNER,
        source: CollaboratorSkillSource.SELF_DECLARED,
      });
      prisma.collaboratorSkill.update.mockResolvedValue({
        ...baseRow,
        validatedAt: new Date('2026-01-01'),
        validatedByUserId: 'u1',
      });

      const out = await service.validate(
        clientId,
        collaboratorId,
        'cs1',
        'u1',
        undefined,
      );
      expect(out.validatedByUserId).toBeDefined();
      expect(prisma.collaboratorSkill.update).toHaveBeenCalled();
    });

    it('invalidate no-op si déjà null', async () => {
      prisma.collaboratorSkill.findFirst.mockResolvedValue({
        id: 'cs1',
        skillId,
      });
      prisma.collaboratorSkill.update.mockResolvedValue({
        ...baseRow,
        validatedAt: null,
        validatedByUserId: null,
      });

      await service.invalidate(
        clientId,
        collaboratorId,
        'cs1',
        'u1',
        undefined,
      );
      expect(prisma.collaboratorSkill.update).toHaveBeenCalled();
    });
  });

  describe('listByCollaborator', () => {
    it('filtre clientId sur count/findMany', async () => {
      prisma.collaborator.findFirst.mockResolvedValue({ id: collaboratorId });
      prisma.$transaction.mockResolvedValue([0, []]);

      await service.listByCollaborator(clientId, collaboratorId, {
        offset: 0,
        limit: 20,
        sortBy: CollaboratorSkillListSortBy.CREATED_AT,
        sortOrder: CollaboratorSkillSortOrder.DESC,
      });

      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('listBySkill', () => {
    it('404 si skill archivée et includeArchived false', async () => {
      prisma.skill.findFirst.mockResolvedValue({
        ...mockSkill,
        status: SkillStatus.ARCHIVED,
      });

      await expect(
        service.listBySkill(clientId, skillId, {
          offset: 0,
          limit: 20,
          includeArchived: false,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});

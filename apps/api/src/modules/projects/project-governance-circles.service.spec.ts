import { ConflictException, NotFoundException } from '@nestjs/common';
import { ProjectTeamColorToken } from '@prisma/client';
import { ProjectGovernanceCirclesService } from './project-governance-circles.service';

describe('ProjectGovernanceCirclesService (RFC-PROJ-023)', () => {
  const projectId = 'proj-1';
  const clientId = 'client-1';

  function buildService(prisma: Record<string, unknown>) {
    const projects = {
      getProjectForScope: jest.fn().mockResolvedValue({ id: projectId }),
    };
    const resources = {
      ensureExternalHuman: jest.fn(),
    };
    return new ProjectGovernanceCirclesService(
      prisma as any,
      projects as any,
      resources as any,
    );
  }

  it('refuse un nom déjà pris (case-insensitive)', async () => {
    const prisma = {
      projectGovernanceCircle: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(null) // ensure defaults skip path via db helper — mocked below
          .mockResolvedValueOnce({ id: 'other', name: 'COPIL' }),
        aggregate: jest.fn().mockResolvedValue({ _max: { sortOrder: 2 } }),
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    // Bypass ensure by stubbing list path — call create after mocking ensure via findFirst for system kinds
    prisma.projectGovernanceCircle.findFirst = jest
      .fn()
      // ensureDefault: COPROJ exists, COPIL exists, COTECH exists
      .mockResolvedValueOnce({ id: 'a' })
      .mockResolvedValueOnce({ id: 'b' })
      .mockResolvedValueOnce({ id: 'c' })
      // assertNameAvailable clash
      .mockResolvedValueOnce({ id: 'b', name: 'COPIL' });

    const svc = buildService(prisma);
    await expect(
      svc.create(clientId, projectId, { name: 'copil' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('supprime une équipe systemKind (H8) sans exiger memberships vides', async () => {
    const prisma = {
      projectGovernanceCircle: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'sys',
          name: 'COPIL',
          systemKind: 'COPIL',
          clientId,
          projectId,
        }),
        delete: jest.fn().mockResolvedValue({}),
      },
      projectReviewTeamConvocation: {
        count: jest.fn().mockResolvedValue(3),
      },
      projectTeamGovernanceMembership: {
        deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      $transaction: jest.fn(async (fn: (tx: any) => Promise<unknown>) =>
        fn({
          projectTeamGovernanceMembership: {
            deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
          },
          projectGovernanceCircle: {
            delete: jest.fn().mockResolvedValue({}),
          },
        }),
      ),
    };
    const svc = buildService(prisma);
    const out = await svc.delete(clientId, projectId, 'sys');
    expect(out).toEqual({ reviewConvocationCount: 3, name: 'COPIL' });
  });

  it('404 si équipe absente', async () => {
    const prisma = {
      projectGovernanceCircle: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      projectReviewTeamConvocation: { count: jest.fn() },
      $transaction: jest.fn(),
    };
    const svc = buildService(prisma);
    await expect(svc.delete(clientId, projectId, 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('accepte colorToken enum', () => {
    expect(Object.values(ProjectTeamColorToken)).toContain('BROWN');
  });
});

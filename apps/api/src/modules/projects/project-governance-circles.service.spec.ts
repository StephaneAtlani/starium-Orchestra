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

  it('crée une équipe avec membre n: sans e-mail (identité libre)', async () => {
    const createdRow = {
      id: 'team-new',
      clientId,
      projectId,
      name: 'Comité ad hoc',
      label: null,
      colorToken: ProjectTeamColorToken.GREEN,
      pilotIdentityKey: null,
      sortOrder: 3,
      systemKind: null,
    };
    const membershipCreate = jest.fn().mockResolvedValue({});
    const prisma = {
      projectGovernanceCircle: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ id: 'a' })
          .mockResolvedValueOnce({ id: 'b' })
          .mockResolvedValueOnce({ id: 'c' })
          .mockResolvedValueOnce(null), // name available
        aggregate: jest.fn().mockResolvedValue({ _max: { sortOrder: 2 } }),
        create: jest.fn().mockResolvedValue(createdRow),
        findMany: jest.fn().mockResolvedValue([
          {
            ...createdRow,
            memberships: [
              {
                identityKey: 'n:alice dupont',
                userId: null,
                resourceId: null,
                displayName: 'Alice Dupont',
                firstName: null,
                lastName: null,
                companyName: null,
                email: null,
                sortOrder: 0,
              },
            ],
          },
        ]),
      },
      projectReviewTeamConvocation: {
        groupBy: jest.fn().mockResolvedValue([]),
      },
      user: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn(async (fn: (tx: any) => Promise<unknown>) =>
        fn({
          projectGovernanceCircle: {
            create: jest.fn().mockResolvedValue(createdRow),
          },
          projectTeamGovernanceMembership: {
            deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
            create: membershipCreate,
          },
        }),
      ),
    };

    const svc = buildService(prisma);
    const out = await svc.create(clientId, projectId, {
      name: 'Comité ad hoc',
      members: [
        {
          identityKey: 'n:alice dupont',
          displayName: 'Alice Dupont',
          sortOrder: 0,
        },
      ],
    });

    expect(membershipCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          identityKey: 'n:alice dupont',
          resourceId: null,
          userId: null,
        }),
      }),
    );
    expect(out.name).toBe('Comité ad hoc');
  });

  it('accepte membre r: sans resourceId explicite (dérivé de la clé)', async () => {
    const createdRow = {
      id: 'team-r',
      clientId,
      projectId,
      name: 'Ops',
      label: null,
      colorToken: ProjectTeamColorToken.TEAL,
      pilotIdentityKey: null,
      sortOrder: 3,
      systemKind: null,
    };
    const membershipCreate = jest.fn().mockResolvedValue({});
    const prisma = {
      projectGovernanceCircle: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ id: 'a' })
          .mockResolvedValueOnce({ id: 'b' })
          .mockResolvedValueOnce({ id: 'c' })
          .mockResolvedValueOnce(null),
        aggregate: jest.fn().mockResolvedValue({ _max: { sortOrder: 2 } }),
        create: jest.fn().mockResolvedValue(createdRow),
        findMany: jest.fn().mockResolvedValue([
          {
            ...createdRow,
            memberships: [
              {
                identityKey: 'r:res-1',
                userId: null,
                resourceId: 'res-1',
                displayName: 'Bob',
                firstName: null,
                lastName: null,
                companyName: null,
                email: null,
                sortOrder: 0,
              },
            ],
          },
        ]),
      },
      projectReviewTeamConvocation: {
        groupBy: jest.fn().mockResolvedValue([]),
      },
      user: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn(async (fn: (tx: any) => Promise<unknown>) =>
        fn({
          projectGovernanceCircle: {
            create: jest.fn().mockResolvedValue(createdRow),
          },
          projectTeamGovernanceMembership: {
            deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
            create: membershipCreate,
          },
        }),
      ),
    };

    const svc = buildService(prisma);
    await svc.create(clientId, projectId, {
      name: 'Ops',
      members: [{ identityKey: 'r:res-1', displayName: 'Bob', sortOrder: 0 }],
    });

    expect(membershipCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          identityKey: 'r:res-1',
          resourceId: 'res-1',
        }),
      }),
    );
  });
});

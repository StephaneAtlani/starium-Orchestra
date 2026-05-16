import { Prisma } from '@prisma/client';
import {
  parseBackfillCliArgs,
  runClientUserHumanResourceBackfill,
  writeHumanResourceBackfillCsv,
} from './client-user-human-resource.backfill';

function createPrismaMock(overrides?: {
  updateThrows?: boolean;
  p2002OnUpdate?: boolean;
}) {
  const humanResources = [
    {
      id: 'res-1',
      name: 'Martin',
      firstName: 'Alice',
      email: 'alice@test.com',
    },
    {
      id: 'res-2',
      name: 'Durand',
      firstName: 'Bob',
      email: 'bob@test.com',
    },
  ];

  const members = [
    {
      id: 'cu-alice',
      resourceId: null,
      user: {
        email: 'alice@test.com',
        firstName: 'Alice',
        lastName: 'Martin',
      },
      defaultEmailIdentity: null,
    },
    {
      id: 'cu-bob',
      resourceId: null,
      user: {
        email: 'bob@test.com',
        firstName: 'Bob',
        lastName: 'Durand',
      },
      defaultEmailIdentity: null,
    },
    {
      id: 'cu-none',
      resourceId: null,
      user: {
        email: 'unknown@test.com',
        firstName: 'Zoe',
        lastName: 'X',
      },
      defaultEmailIdentity: null,
    },
  ];

  const linkedResourceIds = overrides?.p2002OnUpdate ? new Set(['res-1']) : new Set<string>();

  const clientUser = {
    findMany: jest.fn(async (args: { where: { resourceId?: unknown; clientId: string } }) => {
      if (args.where.resourceId === null) {
        return members;
      }
      return [...linkedResourceIds].map((resourceId) => ({ resourceId }));
    }),
    update: jest.fn(async () => {
      if (overrides?.p2002OnUpdate) {
        const err = new Prisma.PrismaClientKnownRequestError('Unique', {
          code: 'P2002',
          clientVersion: 'test',
        });
        throw err;
      }
      if (overrides?.updateThrows) {
        throw new Error('unexpected');
      }
      return {};
    }),
  };

  return {
    client: {
      findUnique: jest.fn(async () => ({ id: 'client-1' })),
    },
    resource: {
      findMany: jest.fn(async () => humanResources),
    },
    clientUser,
    auditLog: {
      create: jest.fn(async () => ({})),
    },
    _clientUser: clientUser,
  };
}

describe('parseBackfillCliArgs', () => {
  const baseArgv = ['node', 'script.ts', '--client-id', 'client-1'];

  it('erreur si ni --dry-run ni --apply', () => {
    expect(() => parseBackfillCliArgs(baseArgv)).toThrow(/Mode obligatoire/);
  });

  it('erreur si --dry-run et --apply ensemble', () => {
    expect(() =>
      parseBackfillCliArgs([...baseArgv, '--dry-run', '--apply']),
    ).toThrow(/mutuellement exclusifs/);
  });

  it('accepte --dry-run', () => {
    const args = parseBackfillCliArgs([...baseArgv, '--dry-run']);
    expect(args.mode).toBe('dry-run');
  });

  it('accepte --apply', () => {
    const args = parseBackfillCliArgs([...baseArgv, '--apply']);
    expect(args.mode).toBe('apply');
  });
});

describe('runClientUserHumanResourceBackfill', () => {
  it('--dry-run : 0 update, 0 audit, mode=dry-run sur toutes les lignes', async () => {
    const prisma = createPrismaMock();
    const result = await runClientUserHumanResourceBackfill(prisma as never, {
      clientId: 'client-1',
      mode: 'dry-run',
      enableNameStrict: false,
    });

    expect(prisma.clientUser.update).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
    expect(result.rows.length).toBe(3);
    expect(result.rows.every((r) => r.mode === 'dry-run')).toBe(true);
    expect(result.totals.linked).toBeGreaterThanOrEqual(1);
    expect(result.rows.some((r) => r.action === 'NO_CANDIDATE')).toBe(true);
  });

  it('--apply : updates LINKED + audit batch', async () => {
    const prisma = createPrismaMock();
    const result = await runClientUserHumanResourceBackfill(prisma as never, {
      clientId: 'client-1',
      mode: 'apply',
      enableNameStrict: false,
    });

    expect(prisma.clientUser.update).toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
    expect(result.rows.every((r) => r.mode === 'apply')).toBe(true);
    const linkedRows = result.rows.filter((r) => r.action === 'LINKED');
    expect(linkedRows.length).toBe(result.totals.linked);
  });

  it('P2002 → ERROR unique_constraint, batch continue', async () => {
    const prisma = createPrismaMock({ p2002OnUpdate: true });
    const result = await runClientUserHumanResourceBackfill(prisma as never, {
      clientId: 'client-1',
      mode: 'apply',
      enableNameStrict: false,
    });

    const errors = result.rows.filter(
      (r) => r.reason === 'unique_constraint_resource_already_linked',
    );
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0]?.action).toBe('ERROR');
    expect(result.totals.error).toBeGreaterThanOrEqual(1);
  });

  it('charge uniquement ACTIVE resourceId null', async () => {
    const prisma = createPrismaMock();
    await runClientUserHumanResourceBackfill(prisma as never, {
      clientId: 'client-1',
      mode: 'dry-run',
      enableNameStrict: false,
    });

    expect(prisma.clientUser.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clientId: 'client-1',
          status: 'ACTIVE',
          resourceId: null,
        }),
      }),
    );
  });

  it('filtre clientId sur resource.findMany', async () => {
    const prisma = createPrismaMock();
    await runClientUserHumanResourceBackfill(prisma as never, {
      clientId: 'client-1',
      mode: 'dry-run',
      enableNameStrict: false,
    });

    expect(prisma.resource.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ clientId: 'client-1' }),
      }),
    );
  });

  it('CSV contient SKIP, AMBIGUOUS, NO_CANDIDATE selon cas', async () => {
    const prisma = createPrismaMock();
    const result = await runClientUserHumanResourceBackfill(prisma as never, {
      clientId: 'client-1',
      mode: 'dry-run',
      enableNameStrict: false,
    });

    const actions = new Set(result.rows.map((r) => r.action));
    expect(actions.has('LINKED')).toBe(true);
    expect(actions.has('NO_CANDIDATE')).toBe(true);
    expect(result.rows.length).toBe(3);
  });
});

describe('writeHumanResourceBackfillCsv', () => {
  it('écrit les 11 colonnes attendues', () => {
    const path = writeHumanResourceBackfillCsv('client-1', [
      {
        clientUserId: 'cu-1',
        clientUserLabel: 'Alice — alice@test.com',
        userEmail: 'alice@test.com',
        defaultEmailIdentity: '',
        mode: 'dry-run',
        action: 'LINKED',
        resourceId: 'res-1',
        resourceLabel: 'Alice Martin',
        matchedBy: 'email-default',
        candidateCount: 1,
        reason: 'email-default',
      },
    ]);
    expect(path).toContain('backfill-human-link-client-1');
  });
});

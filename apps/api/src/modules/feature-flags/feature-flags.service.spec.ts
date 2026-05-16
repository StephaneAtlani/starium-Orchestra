import {
  FeatureFlagsService,
  parseStrictBooleanEnv,
} from './feature-flags.service';
import { FLAG_KEYS } from './flag-keys';
import type { RequestWithClient } from '../../common/types/request-with-client';

describe('parseStrictBooleanEnv', () => {
  it.each([
    ['true', true],
    ['TRUE', true],
    ['True', true],
    ['1', true],
    ['false', false],
    ['0', false],
    ['', false],
    ['yes', false],
    ['on', false],
    [undefined, false],
  ])('parse(%p) → %p', (input, expected) => {
    expect(parseStrictBooleanEnv(input as string | undefined)).toBe(expected);
  });
});

describe('FeatureFlagsService', () => {
  const clientId = 'cclientclientclientclientc';
  const otherClient = 'cclientotherotherotherothe';
  let service: FeatureFlagsService;
  let prisma: { clientFeatureFlag: { findUnique: jest.Mock } };

  beforeEach(() => {
    prisma = {
      clientFeatureFlag: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };
    service = new FeatureFlagsService(prisma as never);
    delete process.env[FLAG_KEYS.ACCESS_DECISION_V2_PROJECTS];
    delete process.env[FLAG_KEYS.ACCESS_DECISION_V2_BUDGETS];
  });

  it('DB hit (enabled=true) → true', async () => {
    prisma.clientFeatureFlag.findUnique.mockResolvedValueOnce({ enabled: true });
    const r = await service.isEnabled(clientId, FLAG_KEYS.ACCESS_DECISION_V2_PROJECTS);
    expect(r).toBe(true);
  });

  it('DB hit (enabled=false) → false (couvre toute valeur env)', async () => {
    process.env[FLAG_KEYS.ACCESS_DECISION_V2_PROJECTS] = 'true';
    prisma.clientFeatureFlag.findUnique.mockResolvedValueOnce({ enabled: false });
    const r = await service.isEnabled(clientId, FLAG_KEYS.ACCESS_DECISION_V2_PROJECTS);
    expect(r).toBe(false);
  });

  it('Pas de DB → env true → true', async () => {
    process.env[FLAG_KEYS.ACCESS_DECISION_V2_PROJECTS] = 'true';
    const r = await service.isEnabled(clientId, FLAG_KEYS.ACCESS_DECISION_V2_PROJECTS);
    expect(r).toBe(true);
  });

  it('Pas de DB, pas d’env → false (défaut)', async () => {
    const r = await service.isEnabled(clientId, FLAG_KEYS.ACCESS_DECISION_V2_PROJECTS);
    expect(r).toBe(false);
  });

  it('Cache requête : 2e appel ne relit ni DB ni env', async () => {
    const request = {} as RequestWithClient;
    prisma.clientFeatureFlag.findUnique.mockResolvedValueOnce({ enabled: true });

    const r1 = await service.isEnabled(
      clientId,
      FLAG_KEYS.ACCESS_DECISION_V2_PROJECTS,
      request,
    );
    const r2 = await service.isEnabled(
      clientId,
      FLAG_KEYS.ACCESS_DECISION_V2_PROJECTS,
      request,
    );
    expect(r1).toBe(true);
    expect(r2).toBe(true);
    expect(prisma.clientFeatureFlag.findUnique).toHaveBeenCalledTimes(1);
  });

  it('Pas de mélange inter-client dans la même requête', async () => {
    const request = {} as RequestWithClient;
    prisma.clientFeatureFlag.findUnique
      .mockResolvedValueOnce({ enabled: true })
      .mockResolvedValueOnce({ enabled: false });

    const r1 = await service.isEnabled(
      clientId,
      FLAG_KEYS.ACCESS_DECISION_V2_PROJECTS,
      request,
    );
    const r2 = await service.isEnabled(
      otherClient,
      FLAG_KEYS.ACCESS_DECISION_V2_PROJECTS,
      request,
    );

    expect(r1).toBe(true);
    expect(r2).toBe(false);
    expect(prisma.clientFeatureFlag.findUnique).toHaveBeenCalledTimes(2);
  });

  it('Pas de mélange inter-flagKey dans la même requête', async () => {
    const request = {} as RequestWithClient;
    prisma.clientFeatureFlag.findUnique
      .mockResolvedValueOnce({ enabled: true })
      .mockResolvedValueOnce({ enabled: false });

    const r1 = await service.isEnabled(
      clientId,
      FLAG_KEYS.ACCESS_DECISION_V2_PROJECTS,
      request,
    );
    const r2 = await service.isEnabled(
      clientId,
      FLAG_KEYS.ACCESS_DECISION_V2_BUDGETS,
      request,
    );

    expect(r1).toBe(true);
    expect(r2).toBe(false);
    expect(prisma.clientFeatureFlag.findUnique).toHaveBeenCalledTimes(2);
  });

  it('Sans request : DB relue à chaque appel (aucun cache global)', async () => {
    prisma.clientFeatureFlag.findUnique
      .mockResolvedValueOnce({ enabled: true })
      .mockResolvedValueOnce({ enabled: true });

    await service.isEnabled(clientId, FLAG_KEYS.ACCESS_DECISION_V2_PROJECTS);
    await service.isEnabled(clientId, FLAG_KEYS.ACCESS_DECISION_V2_PROJECTS);
    expect(prisma.clientFeatureFlag.findUnique).toHaveBeenCalledTimes(2);
  });
});

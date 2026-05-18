import {
  BadRequestException,
  ExecutionContext,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_ACCESS_KEY } from '../../common/decorators/access-decision.decorator';
import type { RequestWithClient } from '../../common/types/request-with-client';
import { FLAG_KEYS } from '../feature-flags/flag-keys';
import { AccessDecisionService } from './access-decision.service';
import { ResourceAccessDecisionGuard } from './resource-access-decision.guard';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';

describe('ResourceAccessDecisionGuard', () => {
  let guard: ResourceAccessDecisionGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let accessDecision: { decide: jest.Mock };
  let featureFlags: { isEnabled: jest.Mock };

  const createContext = (
    request: Partial<RequestWithClient> & { params?: Record<string, string> },
  ): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          params: {},
          ...request,
        }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    accessDecision = {
      decide: jest.fn().mockResolvedValue({
        allowed: true,
        reasonCodes: [],
        resourceType: 'PROJECT',
        intent: 'read',
        rbac: { allowed: true, requiredCandidates: [] },
        floorAllowed: true,
      }),
    };
    featureFlags = { isEnabled: jest.fn().mockResolvedValue(false) };
    guard = new ResourceAccessDecisionGuard(
      reflector as unknown as Reflector,
      accessDecision as unknown as AccessDecisionService,
      featureFlags as unknown as FeatureFlagsService,
    );
  });

  it('sans metadata : autorise sans appeler decide ni isEnabled', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    await expect(
      guard.canActivate(
        createContext({
          user: { userId: 'u1' },
          activeClient: { id: 'c1', role: 'USER' as any, status: 'ACTIVE' as any },
          params: { id: 'p1' },
        }),
      ),
    ).resolves.toBe(true);

    expect(accessDecision.decide).not.toHaveBeenCalled();
    expect(featureFlags.isEnabled).not.toHaveBeenCalled();
  });

  it('flag V2 off : pass-through sans decide', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) =>
      key === REQUIRE_ACCESS_KEY
        ? { resourceType: 'PROJECT', resourceIdParam: 'id', intent: 'read' }
        : undefined,
    );
    featureFlags.isEnabled.mockResolvedValue(false);

    await expect(
      guard.canActivate(
        createContext({
          user: { userId: 'u1' },
          activeClient: { id: 'c1', role: 'USER' as any, status: 'ACTIVE' as any },
          params: { id: 'proj-1' },
        }),
      ),
    ).resolves.toBe(true);

    expect(featureFlags.isEnabled).toHaveBeenCalledWith(
      'c1',
      FLAG_KEYS.ACCESS_DECISION_V2_PROJECTS,
      expect.any(Object),
    );
    expect(accessDecision.decide).not.toHaveBeenCalled();
  });

  it('flag V2 on + decide denied : 403 ACCESS_DECISION_DENIED', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) =>
      key === REQUIRE_ACCESS_KEY
        ? { resourceType: 'PROJECT', resourceIdParam: 'id', intent: 'read' }
        : undefined,
    );
    featureFlags.isEnabled.mockResolvedValue(true);
    accessDecision.decide.mockResolvedValue({
      allowed: false,
      reasonCodes: ['ACCESS_DENIED_ORG_SCOPE'],
      resourceType: 'PROJECT',
      intent: 'read',
      rbac: { allowed: true, requiredCandidates: ['projects.read_scope'] },
      floorAllowed: false,
    });

    try {
      await guard.canActivate(
        createContext({
          user: { userId: 'u1' },
          activeClient: { id: 'c1', role: 'USER' as any, status: 'ACTIVE' as any },
          params: { id: 'proj-1' },
        }),
      );
      fail('expected ForbiddenException');
    } catch (e) {
      expect(e).toBeInstanceOf(ForbiddenException);
      const res = (e as ForbiddenException).getResponse() as Record<string, unknown>;
      expect(res.reasonCode).toBe('ACCESS_DECISION_DENIED');
      expect(res.reasonCodes).toEqual(['ACCESS_DENIED_ORG_SCOPE']);
    }
  });

  it('param route manquant : BadRequestException', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) =>
      key === REQUIRE_ACCESS_KEY
        ? { resourceType: 'PROJECT', resourceIdParam: 'id', intent: 'read' }
        : undefined,
    );

    await expect(
      guard.canActivate(
        createContext({
          user: { userId: 'u1' },
          activeClient: { id: 'c1', role: 'USER' as any, status: 'ACTIVE' as any },
          params: {},
        }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('resourceType invalide : InternalServerErrorException (500)', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) =>
      key === REQUIRE_ACCESS_KEY
        ? { resourceType: 'NOT_A_TYPE', resourceIdParam: 'id', intent: 'read' }
        : undefined,
    );

    await expect(
      guard.canActivate(
        createContext({
          user: { userId: 'u1' },
          activeClient: { id: 'c1', role: 'USER' as any, status: 'ACTIVE' as any },
          params: { id: 'x' },
        }),
      ),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
    expect(featureFlags.isEnabled).not.toHaveBeenCalled();
  });

  it('BUDGET_LINE utilise ACCESS_DECISION_V2_BUDGETS', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) =>
      key === REQUIRE_ACCESS_KEY
        ? { resourceType: 'BUDGET_LINE', resourceIdParam: 'id', intent: 'read' }
        : undefined,
    );
    featureFlags.isEnabled.mockResolvedValue(false);

    await guard.canActivate(
      createContext({
        user: { userId: 'u1' },
        activeClient: { id: 'c1', role: 'USER' as any, status: 'ACTIVE' as any },
        params: { id: 'line-1' },
      }),
    );

    expect(featureFlags.isEnabled).toHaveBeenCalledWith(
      'c1',
      FLAG_KEYS.ACCESS_DECISION_V2_BUDGETS,
      expect.any(Object),
    );
  });

  it('cache requête : un seul appel decide pour la même clé', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) =>
      key === REQUIRE_ACCESS_KEY
        ? { resourceType: 'PROJECT', resourceIdParam: 'id', intent: 'read' }
        : undefined,
    );
    featureFlags.isEnabled.mockResolvedValue(true);
    const req: RequestWithClient = {
      user: { userId: 'u1' },
      activeClient: { id: 'c1', role: 'USER' as any, status: 'ACTIVE' as any },
      params: { id: 'proj-1' },
    } as RequestWithClient;
    const ctx = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext;

    await guard.canActivate(ctx);
    await guard.canActivate(ctx);

    expect(accessDecision.decide).toHaveBeenCalledTimes(1);
    expect(req.accessDecisionCache?.size).toBe(1);
  });
});

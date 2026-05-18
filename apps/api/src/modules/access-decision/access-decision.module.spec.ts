import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { AccessDecisionService } from './access-decision.service';
import { ResourceAccessDecisionGuard } from './resource-access-decision.guard';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';

/**
 * RFC-ACL-025 — DI du guard (évite stack overflow du module complet Prisma/Common/ACL).
 * L’export depuis AccessDecisionModule est vérifié statiquement dans access-decision.module.ts.
 */
describe('ResourceAccessDecisionGuard DI', () => {
  it('instanciable avec Reflector, AccessDecisionService et FeatureFlagsService', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ResourceAccessDecisionGuard,
        Reflector,
        { provide: AccessDecisionService, useValue: { decide: jest.fn() } },
        { provide: FeatureFlagsService, useValue: { isEnabled: jest.fn() } },
      ],
    }).compile();

    const guard = moduleRef.get(ResourceAccessDecisionGuard);
    expect(guard).toBeInstanceOf(ResourceAccessDecisionGuard);
  });
});

import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { FeatureFlagsModule } from '../../modules/feature-flags/feature-flags.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { EffectivePermissionsService } from '../services/effective-permissions.service';

describe('PermissionsGuard DI bootstrap (RFC-ACL-024)', () => {
  it('résout PermissionsGuard avec FeatureFlagsModule @Global sans cycle', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PrismaModule, FeatureFlagsModule],
      providers: [PermissionsGuard, EffectivePermissionsService, Reflector],
    }).compile();

    const guard = moduleRef.get(PermissionsGuard);
    expect(guard).toBeInstanceOf(PermissionsGuard);
    await moduleRef.close();
  });
});

import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ModuleVisibilityModule } from '../modules/module-visibility/module-visibility.module';
import { ActiveClientCacheService } from './cache/active-client-cache.service';
import { OrganizationScopeService } from './organization/organization-scope.service';
import { EffectivePermissionsService } from './services/effective-permissions.service';

@Global()
@Module({
  imports: [PrismaModule, ModuleVisibilityModule],
  providers: [
    ActiveClientCacheService,
    EffectivePermissionsService,
    OrganizationScopeService,
  ],
  exports: [
    ActiveClientCacheService,
    EffectivePermissionsService,
    OrganizationScopeService,
    ModuleVisibilityModule,
  ],
})
export class CommonModule {}

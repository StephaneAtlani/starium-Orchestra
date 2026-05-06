import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ModuleVisibilityModule } from '../modules/module-visibility/module-visibility.module';
import { ActiveClientCacheService } from './cache/active-client-cache.service';
import { EffectivePermissionsService } from './services/effective-permissions.service';

@Global()
@Module({
  imports: [PrismaModule, ModuleVisibilityModule],
  providers: [ActiveClientCacheService, EffectivePermissionsService],
  exports: [
    ActiveClientCacheService,
    EffectivePermissionsService,
    ModuleVisibilityModule,
  ],
})
export class CommonModule {}

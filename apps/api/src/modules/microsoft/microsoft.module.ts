import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type IORedis from 'ioredis';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { ProjectsModule } from '../projects/projects.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { QueueModule } from '../queue/queue.module';
import { QUEUE_CONNECTION } from '../queue/queue.constants';
import { MicrosoftTokenCryptoService } from './microsoft-token-crypto.service';
import {
  DbMicrosoftOAuthStateStore,
  MemoryMicrosoftOAuthStateStore,
  MicrosoftOAuthStateStore,
  RedisMicrosoftOAuthStateStore,
} from './microsoft-oauth-state.store';
import { MicrosoftRefreshLockService } from './microsoft-refresh-lock.service';
import { MicrosoftIdTokenService } from './microsoft-id-token.service';
import { MicrosoftTokenHttpService } from './microsoft-token-http.service';
import { MicrosoftOAuthService } from './microsoft-oauth.service';
import { MicrosoftAuthController } from './microsoft-auth.controller';
import { MicrosoftOAuthCallbackController } from './microsoft-oauth-callback.controller';
import { MicrosoftCallbackRateLimitService } from './microsoft-callback-rate-limit.service';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { MicrosoftIntegrationAccessGuard } from '../../common/guards/microsoft-integration-access.guard';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { MicrosoftPlatformConfigService } from './microsoft-platform-config.service';
import { ClientMicrosoftOAuthService } from './client-microsoft-oauth.service';
import { PlatformMicrosoftSettingsController } from './platform-microsoft-settings.controller';
import { ClientMicrosoftOAuthController } from './client-microsoft-oauth.controller';
import { MicrosoftGraphService } from './microsoft-graph.service';
import { MicrosoftSelectionController } from './microsoft-selection.controller';
import { MicrosoftSelectionService } from './microsoft-selection.service';
import { ProjectMicrosoftLinksController } from './project-microsoft-links.controller';
import { ProjectMicrosoftLinksService } from './project-microsoft-links.service';

@Module({
  imports: [PrismaModule, AuthModule, AuditLogsModule, ProjectsModule, QueueModule],
  controllers: [
    MicrosoftAuthController,
    MicrosoftOAuthCallbackController,
    PlatformMicrosoftSettingsController,
    ClientMicrosoftOAuthController,
    MicrosoftSelectionController,
    ProjectMicrosoftLinksController,
  ],
  providers: [
    ActiveClientGuard,
    ModuleAccessGuard,
    PermissionsGuard,
    MicrosoftIntegrationAccessGuard,
    PlatformAdminGuard,
    MicrosoftPlatformConfigService,
    ClientMicrosoftOAuthService,
    MicrosoftTokenCryptoService,
    MemoryMicrosoftOAuthStateStore,
    {
      provide: MicrosoftOAuthStateStore,
      useFactory: (
        config: ConfigService,
        memory: MemoryMicrosoftOAuthStateStore,
        prisma: PrismaService,
        redis: IORedis,
      ) => {
        const log = new Logger('MicrosoftOAuthStateStoreFactory');
        const mode = (
          config.get<string>('MICROSOFT_OAUTH_STATE_STORE')?.trim() || 'db'
        ).toLowerCase();
        if (mode === 'redis') {
          log.log('store=redis');
          return new RedisMicrosoftOAuthStateStore(redis);
        }
        if (mode === 'memory') {
          log.warn(
            'store=memory : OK process unique uniquement, ne PAS utiliser avec plusieurs instances API',
          );
          return memory;
        }
        log.log('store=db (Postgres, partagé entre instances)');
        return new DbMicrosoftOAuthStateStore(prisma);
      },
      inject: [
        ConfigService,
        MemoryMicrosoftOAuthStateStore,
        PrismaService,
        QUEUE_CONNECTION,
      ],
    },
    MicrosoftRefreshLockService,
    MicrosoftIdTokenService,
    MicrosoftTokenHttpService,
    MicrosoftOAuthService,
    MicrosoftGraphService,
    MicrosoftCallbackRateLimitService,
    MicrosoftSelectionService,
    ProjectMicrosoftLinksService,
  ],
  exports: [
    MicrosoftOAuthService,
    MicrosoftGraphService,
    MicrosoftTokenCryptoService,
    MicrosoftPlatformConfigService,
    ClientMicrosoftOAuthService,
  ],
})
export class MicrosoftModule {}

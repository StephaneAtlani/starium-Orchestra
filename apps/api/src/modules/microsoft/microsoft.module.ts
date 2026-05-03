import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type IORedis from 'ioredis';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ProjectsModule } from '../projects/projects.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { QueueModule } from '../queue/queue.module';
import { QUEUE_CONNECTION } from '../queue/queue.constants';
import { MicrosoftTokenCryptoService } from './microsoft-token-crypto.service';
import {
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
        redis: IORedis,
      ) => {
        const mode =
          config.get<string>('MICROSOFT_OAUTH_STATE_STORE')?.trim() ||
          'memory';
        if (mode.toLowerCase() === 'redis') {
          return new RedisMicrosoftOAuthStateStore(redis);
        }
        return memory;
      },
      inject: [ConfigService, MemoryMicrosoftOAuthStateStore, QUEUE_CONNECTION],
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

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ProjectsModule } from '../projects/projects.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { MicrosoftTokenCryptoService } from './microsoft-token-crypto.service';
import {
  MemoryMicrosoftOAuthStateStore,
  MicrosoftOAuthStateStore,
  PrismaMicrosoftOAuthStateStore,
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
  imports: [PrismaModule, AuthModule, AuditLogsModule, ProjectsModule],
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
    PrismaMicrosoftOAuthStateStore,
    {
      provide: MicrosoftOAuthStateStore,
      useExisting: PrismaMicrosoftOAuthStateStore,
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

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { MicrosoftTokenCryptoService } from './microsoft-token-crypto.service';
import {
  MemoryMicrosoftOAuthStateStore,
  MicrosoftOAuthStateStore,
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

@Module({
  imports: [PrismaModule, AuthModule, AuditLogsModule],
  controllers: [MicrosoftAuthController, MicrosoftOAuthCallbackController],
  providers: [
    ActiveClientGuard,
    ModuleAccessGuard,
    PermissionsGuard,
    MicrosoftIntegrationAccessGuard,
    MicrosoftTokenCryptoService,
    MemoryMicrosoftOAuthStateStore,
    {
      provide: MicrosoftOAuthStateStore,
      useExisting: MemoryMicrosoftOAuthStateStore,
    },
    MicrosoftRefreshLockService,
    MicrosoftIdTokenService,
    MicrosoftTokenHttpService,
    MicrosoftOAuthService,
    MicrosoftCallbackRateLimitService,
  ],
  exports: [MicrosoftOAuthService, MicrosoftTokenCryptoService],
})
export class MicrosoftModule {}

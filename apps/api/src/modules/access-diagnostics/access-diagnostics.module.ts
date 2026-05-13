import { Module, forwardRef } from '@nestjs/common';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ClientAdminGuard } from '../../common/guards/client-admin.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { AccessControlModule } from '../access-control/access-control.module';
import { AccessDecisionModule } from '../access-decision/access-decision.module';
import { AuthModule } from '../auth/auth.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ModuleVisibilityModule } from '../module-visibility/module-visibility.module';
import { AccessDiagnosticsController } from './access-diagnostics.controller';
import { AccessDiagnosticsSelfController } from './access-diagnostics-self.controller';
import { AccessDiagnosticsService } from './access-diagnostics.service';
import { PlatformAccessDiagnosticsController } from './platform-access-diagnostics.controller';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    forwardRef(() => AccessControlModule),
    forwardRef(() => AccessDecisionModule),
    ModuleVisibilityModule,
    AuditLogsModule,
  ],
  controllers: [
    AccessDiagnosticsController,
    AccessDiagnosticsSelfController,
    PlatformAccessDiagnosticsController,
  ],
  providers: [
    AccessDiagnosticsService,
    ActiveClientGuard,
    ClientAdminGuard,
    PlatformAdminGuard,
    PermissionsGuard,
  ],
  exports: [AccessDiagnosticsService],
})
export class AccessDiagnosticsModule {}

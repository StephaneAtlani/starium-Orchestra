import { Module } from '@nestjs/common';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ClientAdminGuard } from '../../common/guards/client-admin.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { AccessControlModule } from '../access-control/access-control.module';
import { AuthModule } from '../auth/auth.module';
import { ModuleVisibilityModule } from '../module-visibility/module-visibility.module';
import { AccessDiagnosticsController } from './access-diagnostics.controller';
import { AccessDiagnosticsService } from './access-diagnostics.service';
import { PlatformAccessDiagnosticsController } from './platform-access-diagnostics.controller';

@Module({
  imports: [PrismaModule, AuthModule, AccessControlModule, ModuleVisibilityModule],
  controllers: [AccessDiagnosticsController, PlatformAccessDiagnosticsController],
  providers: [
    AccessDiagnosticsService,
    ActiveClientGuard,
    ClientAdminGuard,
    PlatformAdminGuard,
    PermissionsGuard,
  ],
})
export class AccessDiagnosticsModule {}

import { Module } from '@nestjs/common';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ClientAdminGuard } from '../../common/guards/client-admin.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsCoreModule } from '../audit-logs/audit-logs-core.module';
import { AuthModule } from '../auth/auth.module';
import {
  ClientLicensesController,
  PlatformLicensesController,
} from './licenses.controller';
import { LicenseService } from './license.service';
import { SubscriptionService } from './subscription.service';

@Module({
  imports: [PrismaModule, AuthModule, AuditLogsCoreModule],
  controllers: [PlatformLicensesController, ClientLicensesController],
  providers: [
    LicenseService,
    SubscriptionService,
    PlatformAdminGuard,
    ActiveClientGuard,
    ModuleAccessGuard,
    PermissionsGuard,
    ClientAdminGuard,
  ],
  exports: [LicenseService, SubscriptionService],
})
export class LicensesModule {}

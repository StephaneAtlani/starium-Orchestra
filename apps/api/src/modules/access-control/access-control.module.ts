import { Module, forwardRef } from '@nestjs/common';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ClientAdminGuard } from '../../common/guards/client-admin.guard';
import { ActiveClientOrPlatformContextGuard } from '../../common/guards/active-client-or-platform-context.guard';
import { ClientAdminOrPlatformAdminGuard } from '../../common/guards/client-admin-or-platform-admin.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { AuthModule } from '../auth/auth.module';
import { AccessControlService } from './access-control.service';
import { ResourceAclController } from './resource-acl.controller';
import { ResourceAclGuard } from './guards/resource-acl.guard';
import { AccessDiagnosticsModule } from '../access-diagnostics/access-diagnostics.module';

@Module({
  imports: [
    forwardRef(() => AccessDiagnosticsModule),
    AuthModule,
    PrismaModule,
    AuditLogsModule,
  ],
  controllers: [ResourceAclController],
  providers: [
    AccessControlService,
    ResourceAclGuard,
    ActiveClientGuard,
    ActiveClientOrPlatformContextGuard,
    ClientAdminGuard,
    ClientAdminOrPlatformAdminGuard,
  ],
  exports: [AccessControlService, ResourceAclGuard],
})
export class AccessControlModule {}

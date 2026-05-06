import { Module } from '@nestjs/common';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ClientAdminGuard } from '../../common/guards/client-admin.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { AuthModule } from '../auth/auth.module';
import { AccessControlService } from './access-control.service';
import { ResourceAclController } from './resource-acl.controller';
import { ResourceAclGuard } from './guards/resource-acl.guard';

@Module({
  imports: [AuthModule, PrismaModule, AuditLogsModule],
  controllers: [ResourceAclController],
  providers: [
    AccessControlService,
    ResourceAclGuard,
    ActiveClientGuard,
    ClientAdminGuard,
  ],
  exports: [AccessControlService, ResourceAclGuard],
})
export class AccessControlModule {}

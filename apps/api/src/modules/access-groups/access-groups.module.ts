import { Module } from '@nestjs/common';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ClientAdminGuard } from '../../common/guards/client-admin.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { AuthModule } from '../auth/auth.module';
import { AccessGroupsController } from './access-groups.controller';
import { AccessGroupsService } from './access-groups.service';

@Module({
  imports: [AuthModule, PrismaModule, AuditLogsModule],
  controllers: [AccessGroupsController],
  providers: [AccessGroupsService, ActiveClientGuard, ClientAdminGuard],
  exports: [AccessGroupsService],
})
export class AccessGroupsModule {}

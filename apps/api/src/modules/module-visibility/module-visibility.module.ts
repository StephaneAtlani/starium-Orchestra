import { Module } from '@nestjs/common';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ClientAdminGuard } from '../../common/guards/client-admin.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { AuthModule } from '../auth/auth.module';
import { ModuleVisibilityController } from './module-visibility.controller';
import { ModuleVisibilityService } from './module-visibility.service';

@Module({
  imports: [AuthModule, PrismaModule, AuditLogsModule],
  controllers: [ModuleVisibilityController],
  providers: [
    ModuleVisibilityService,
    ActiveClientGuard,
    ClientAdminGuard,
  ],
  exports: [ModuleVisibilityService],
})
export class ModuleVisibilityModule {}

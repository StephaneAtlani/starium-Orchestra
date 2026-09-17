import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { ComplianceController } from './compliance.controller';
import { PlatformComplianceFrameworksController } from './platform-compliance-frameworks.controller';
import { PlatformCisoLibrariesController } from './platform-ciso-libraries.controller';
import { ComplianceService } from './compliance.service';
import { CisoLibraryImportService } from './ciso-library-import.service';
import { ComplianceRemindersService } from './compliance-reminders.service';
import { ComplianceRemindersSchedulerService } from './compliance-reminders-scheduler.service';

@Module({
  imports: [PrismaModule, AuditLogsModule, NotificationsModule],
  controllers: [
    ComplianceController,
    PlatformComplianceFrameworksController,
    PlatformCisoLibrariesController,
  ],
  providers: [
    ComplianceService,
    CisoLibraryImportService,
    PlatformAdminGuard,
    ComplianceRemindersService,
    ComplianceRemindersSchedulerService,
  ],
  exports: [ComplianceService, ComplianceRemindersService],
})
export class ComplianceModule {}

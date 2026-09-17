import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { ComplianceController } from './compliance.controller';
import { PlatformComplianceFrameworksController } from './platform-compliance-frameworks.controller';
import { PlatformCisoLibrariesController } from './platform-ciso-libraries.controller';
import { ComplianceService } from './compliance.service';
import { CisoLibraryImportService } from './ciso-library-import.service';

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [
    ComplianceController,
    PlatformComplianceFrameworksController,
    PlatformCisoLibrariesController,
  ],
  providers: [ComplianceService, CisoLibraryImportService, PlatformAdminGuard],
  exports: [ComplianceService],
})
export class ComplianceModule {}

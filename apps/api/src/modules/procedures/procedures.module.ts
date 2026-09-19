import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PlatformUploadModule } from '../platform-upload/platform-upload.module';
import { ProcurementModule } from '../procurement/procurement.module';
import { ProcedureAssetsController } from './procedure-assets.controller';
import { ProcedureAssetsService } from './procedure-assets.service';
import { ProceduresController } from './procedures.controller';
import { ProceduresService } from './procedures.service';
import { ProcedureSettingsService } from './procedure-settings.service';
import { ProcedureCategoriesService } from './procedure-categories.service';
import { ProcedureStakeholdersService } from './procedure-stakeholders.service';
import { ProcedureTemplatesController } from './procedure-templates.controller';
import { ProcedureTemplatesService } from './procedure-templates.service';

@Module({
  imports: [
    AuditLogsModule,
    ProcurementModule,
    PlatformUploadModule,
    NotificationsModule,
    EmailModule,
  ],
  controllers: [
    ProceduresController,
    ProcedureAssetsController,
    ProcedureTemplatesController,
  ],
  providers: [
    ProceduresService,
    ProcedureAssetsService,
    ProcedureSettingsService,
    ProcedureCategoriesService,
    ProcedureStakeholdersService,
    ProcedureTemplatesService,
  ],
  exports: [
    ProceduresService,
    ProcedureAssetsService,
    ProcedureSettingsService,
    ProcedureCategoriesService,
    ProcedureStakeholdersService,
    ProcedureTemplatesService,
  ],
})
export class ProceduresModule {}

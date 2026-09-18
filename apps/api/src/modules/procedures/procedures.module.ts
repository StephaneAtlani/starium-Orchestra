import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { PlatformUploadModule } from '../platform-upload/platform-upload.module';
import { ProcurementModule } from '../procurement/procurement.module';
import { ProcedureAssetsController } from './procedure-assets.controller';
import { ProcedureAssetsService } from './procedure-assets.service';
import { ProceduresController } from './procedures.controller';
import { ProceduresService } from './procedures.service';
import { ProcedureSettingsService } from './procedure-settings.service';

@Module({
  imports: [AuditLogsModule, ProcurementModule, PlatformUploadModule],
  controllers: [ProceduresController, ProcedureAssetsController],
  providers: [
    ProceduresService,
    ProcedureAssetsService,
    ProcedureSettingsService,
  ],
  exports: [
    ProceduresService,
    ProcedureAssetsService,
    ProcedureSettingsService,
  ],
})
export class ProceduresModule {}

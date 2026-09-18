import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { PlatformUploadModule } from '../platform-upload/platform-upload.module';
import { ProcurementModule } from '../procurement/procurement.module';
import { ProcedureAssetsController } from './procedure-assets.controller';
import { ProcedureAssetsService } from './procedure-assets.service';
import { ProceduresController } from './procedures.controller';
import { ProceduresService } from './procedures.service';

@Module({
  imports: [AuditLogsModule, ProcurementModule, PlatformUploadModule],
  controllers: [ProceduresController, ProcedureAssetsController],
  providers: [ProceduresService, ProcedureAssetsService],
  exports: [ProceduresService, ProcedureAssetsService],
})
export class ProceduresModule {}

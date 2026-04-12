import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { BudgetImportController } from './budget-import.controller';
import { BudgetImportService } from './budget-import.service';
import { BudgetImportFileStoreService } from './budget-import-file-store.service';
import { BudgetImportParserService } from './budget-import-parser.service';
import { BudgetImportMatchingService } from './budget-import-matching.service';
import { BudgetImportMappingsController } from './budget-import-mappings.controller';
import { BudgetImportMappingsService } from './budget-import-mappings.service';
import { PlatformUploadModule } from '../platform-upload/platform-upload.module';

@Module({
  imports: [PrismaModule, AuditLogsModule, PlatformUploadModule],
  controllers: [BudgetImportController, BudgetImportMappingsController],
  providers: [
    BudgetImportService,
    BudgetImportFileStoreService,
    BudgetImportParserService,
    BudgetImportMatchingService,
    BudgetImportMappingsService,
  ],
  exports: [BudgetImportService, BudgetImportMappingsService],
})
export class BudgetImportModule {}

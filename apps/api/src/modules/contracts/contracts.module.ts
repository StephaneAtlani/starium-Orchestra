import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ProcurementModule } from '../procurement/procurement.module';
import { PlatformUploadModule } from '../platform-upload/platform-upload.module';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { ContractAttachmentsController } from './contract-attachments.controller';
import { ContractAttachmentsService } from './contract-attachments.service';

@Module({
  imports: [PrismaModule, AuditLogsModule, ProcurementModule, PlatformUploadModule],
  controllers: [ContractsController, ContractAttachmentsController],
  providers: [ContractsService, ContractAttachmentsService],
  exports: [ContractsService, ContractAttachmentsService],
})
export class ContractsModule {}

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ProcurementModule } from '../procurement/procurement.module';
import { PlatformUploadModule } from '../platform-upload/platform-upload.module';
import { ContractKindTypesController } from './contract-kind-types.controller';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { ContractAttachmentsController } from './contract-attachments.controller';
import { ContractAttachmentsService } from './contract-attachments.service';
import { ContractKindTypesService } from './contract-kind-types.service';
import { AccessControlModule } from '../access-control/access-control.module';
import { AccessDecisionModule } from '../access-decision/access-decision.module';
import { FeatureFlagsModule } from '../feature-flags/feature-flags.module';
import { OrganizationModule } from '../organization/organization.module';

@Module({
  imports: [
    PrismaModule,
    AuditLogsModule,
    ProcurementModule,
    PlatformUploadModule,
    AccessControlModule,
    AccessDecisionModule,
    FeatureFlagsModule,
    OrganizationModule,
  ],
  controllers: [
    ContractsController,
    ContractKindTypesController,
    ContractAttachmentsController,
  ],
  providers: [
    ContractsService,
    ContractAttachmentsService,
    ContractKindTypesService,
  ],
  exports: [ContractsService, ContractAttachmentsService, ContractKindTypesService],
})
export class ContractsModule {}

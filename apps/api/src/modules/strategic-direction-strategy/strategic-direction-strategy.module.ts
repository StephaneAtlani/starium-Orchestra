import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ClientsModule } from '../clients/clients.module';
import { EmailModule } from '../email/email.module';
import { PlatformUploadModule } from '../platform-upload/platform-upload.module';
import { ProcurementModule } from '../procurement/procurement.module';
import { StrategicDirectionStrategyController } from './strategic-direction-strategy.controller';
import { StrategicDirectionStrategyDocumentsController } from './strategic-direction-strategy-documents.controller';
import { StrategicDirectionStrategyDocumentsService } from './strategic-direction-strategy-documents.service';
import { StrategicDirectionStrategyService } from './strategic-direction-strategy.service';

@Module({
  imports: [
    PrismaModule,
    AuditLogsModule,
    ClientsModule,
    EmailModule,
    ProcurementModule,
    PlatformUploadModule,
  ],
  controllers: [
    StrategicDirectionStrategyDocumentsController,
    StrategicDirectionStrategyController,
  ],
  providers: [
    StrategicDirectionStrategyService,
    StrategicDirectionStrategyDocumentsService,
  ],
  exports: [StrategicDirectionStrategyService],
})
export class StrategicDirectionStrategyModule {}

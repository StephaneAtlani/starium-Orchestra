import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ClientsModule } from '../clients/clients.module';
import { EmailModule } from '../email/email.module';
import { StrategicDirectionStrategyController } from './strategic-direction-strategy.controller';
import { StrategicDirectionStrategyService } from './strategic-direction-strategy.service';

@Module({
  imports: [PrismaModule, AuditLogsModule, ClientsModule, EmailModule],
  controllers: [StrategicDirectionStrategyController],
  providers: [StrategicDirectionStrategyService],
  exports: [StrategicDirectionStrategyService],
})
export class StrategicDirectionStrategyModule {}

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { AlertsTriggerService } from './alerts-trigger.service';

@Module({
  imports: [AuthModule, PrismaModule, AuditLogsModule, EmailModule],
  controllers: [AlertsController],
  providers: [AlertsService, AlertsTriggerService],
  exports: [AlertsService, AlertsTriggerService],
})
export class AlertsModule {}

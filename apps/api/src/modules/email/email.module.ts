import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsCoreModule } from '../audit-logs/audit-logs-core.module';
import { QueueModule } from '../queue/queue.module';
import { EmailService } from './email.service';

@Module({
  imports: [PrismaModule, QueueModule, AuditLogsCoreModule],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}

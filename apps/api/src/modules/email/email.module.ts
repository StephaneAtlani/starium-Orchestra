import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { QueueModule } from '../queue/queue.module';
import { EmailService } from './email.service';

@Module({
  imports: [PrismaModule, QueueModule, AuditLogsModule],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}

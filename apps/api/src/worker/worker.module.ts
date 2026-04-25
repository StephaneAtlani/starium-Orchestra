import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogsModule } from '../modules/audit-logs/audit-logs.module';
import { QueueModule } from '../modules/queue/queue.module';
import { EmailModule } from '../modules/email/email.module';
import { EmailProcessor } from '../modules/email/email.processor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env', 'apps/api/.env'],
    }),
    PrismaModule,
    AuditLogsModule,
    QueueModule,
    EmailModule,
  ],
  providers: [EmailProcessor],
})
export class WorkerModule {}

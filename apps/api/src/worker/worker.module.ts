import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogsCoreModule } from '../modules/audit-logs/audit-logs-core.module';
import { QueueModule } from '../modules/queue/queue.module';
import { EmailModule } from '../modules/email/email.module';
import { EmailProcessor } from '../modules/email/email.processor';
import { LicensesModule } from '../modules/licenses/licenses.module';
import { LicenseExpirationProcessor } from '../modules/licenses/jobs/license-expiration.processor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env', 'apps/api/.env'],
    }),
    PrismaModule,
    AuditLogsCoreModule,
    QueueModule,
    EmailModule,
    LicensesModule,
  ],
  providers: [EmailProcessor, LicenseExpirationProcessor],
})
export class WorkerModule {}

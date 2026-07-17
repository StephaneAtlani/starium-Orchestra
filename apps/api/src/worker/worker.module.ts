import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogsCoreModule } from '../modules/audit-logs/audit-logs-core.module';
import { QueueModule } from '../modules/queue/queue.module';
import { EmailModule } from '../modules/email/email.module';
import { EmailProcessor } from '../modules/email/email.processor';
import { LicensesWorkerModule } from '../modules/licenses/licenses-worker.module';
import { LicenseExpirationProcessor } from '../modules/licenses/jobs/license-expiration.processor';
import { MicrosoftModule } from '../modules/microsoft/microsoft.module';
import { ProjectMicrosoftTeamsProvisioningProcessor } from '../modules/microsoft/project-microsoft-teams-provisioning.processor';

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
    LicensesWorkerModule,
    MicrosoftModule,
  ],
  providers: [
    EmailProcessor,
    LicenseExpirationProcessor,
    ProjectMicrosoftTeamsProvisioningProcessor,
  ],
})
export class WorkerModule {}

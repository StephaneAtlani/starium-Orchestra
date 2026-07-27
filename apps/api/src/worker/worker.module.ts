import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthCommonModule } from '../common/auth/auth-common.module';
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
    // `AuthCommonModule` est `@Global()`, mais un module global ne l'est que
    // dans le contexte applicatif qui l'importe. `AppModule` l'importe ; sans
    // cette ligne, le worker ne peut pas résoudre `EmailReservationService` /
    // `SensitiveOperationPolicyService`, tirés par `CollaboratorsService` via
    // MicrosoftModule → AuthModule → UsersModule → CollaboratorsModule.
    AuthCommonModule,
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

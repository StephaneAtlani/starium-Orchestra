import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsCoreModule } from '../audit-logs/audit-logs-core.module';
import { LicenseExpirationRunnerService } from './jobs/license-expiration-runner.service';

/**
 * Sous-ensemble licences pour le worker BullMQ (pas de controllers ni guards HTTP).
 */
@Module({
  imports: [PrismaModule, AuditLogsCoreModule],
  providers: [LicenseExpirationRunnerService],
  exports: [LicenseExpirationRunnerService],
})
export class LicensesWorkerModule {}

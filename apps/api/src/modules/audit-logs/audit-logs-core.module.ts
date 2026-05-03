import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsService } from './audit-logs.service';

/**
 * Service d’audit uniquement (sans contrôleurs HTTP / guards).
 * Pour worker, jobs, tests qui n’ont pas besoin des routes REST.
 */
@Module({
  imports: [PrismaModule],
  providers: [AuditLogsService],
  exports: [AuditLogsService],
})
export class AuditLogsCoreModule {}

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { GovernanceCyclesController } from './governance-cycles.controller';
import { GovernanceCyclesService } from './governance-cycles.service';

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [GovernanceCyclesController],
  providers: [GovernanceCyclesService],
  exports: [GovernanceCyclesService],
})
export class GovernanceCyclesModule {}

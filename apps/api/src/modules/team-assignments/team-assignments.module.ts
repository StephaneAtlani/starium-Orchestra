import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { TeamAssignmentsController } from './team-assignments.controller';
import { TeamAssignmentsService } from './team-assignments.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [TeamAssignmentsController],
  providers: [TeamAssignmentsService],
  exports: [TeamAssignmentsService],
})
export class TeamAssignmentsModule {}

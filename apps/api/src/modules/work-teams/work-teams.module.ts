import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { ManagerScopesController } from './manager-scopes.controller';
import { ManagerScopesService } from './manager-scopes.service';
import { WorkTeamMembershipsService } from './work-team-memberships.service';
import { WorkTeamsController } from './work-teams.controller';
import { WorkTeamsService } from './work-teams.service';

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [WorkTeamsController, ManagerScopesController],
  providers: [WorkTeamsService, WorkTeamMembershipsService, ManagerScopesService],
  exports: [WorkTeamsService, WorkTeamMembershipsService],
})
export class WorkTeamsModule {}

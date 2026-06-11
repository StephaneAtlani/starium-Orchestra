import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { AccessControlModule } from '../access-control/access-control.module';
import { ClientsModule } from '../clients/clients.module';
import { EmailModule } from '../email/email.module';
import { ProjectsModule } from '../projects/projects.module';
import { ProjectRequestsController } from './project-requests.controller';
import { ProjectRequestsService } from './project-requests.service';
import { ProjectRequestWorkflowService } from './project-request-workflow.service';
import { ProjectRequestToProjectConverter } from './project-request-to-project.converter';
import { ProjectRequestPilotingCycleRoutingService } from './project-request-piloting-cycle-routing.service';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { LicenseWriteGuard } from '../../common/guards/license-write.guard';

@Module({
  imports: [
    PrismaModule,
    AuditLogsModule,
    AccessControlModule,
    CommonModule,
    ClientsModule,
    EmailModule,
    ProjectsModule,
  ],
  controllers: [ProjectRequestsController],
  providers: [
    ProjectRequestsService,
    ProjectRequestWorkflowService,
    ProjectRequestToProjectConverter,
    ProjectRequestPilotingCycleRoutingService,
    ActiveClientGuard,
    ModuleAccessGuard,
    PermissionsGuard,
    LicenseWriteGuard,
  ],
  exports: [ProjectRequestsService],
})
export class ProjectRequestsModule {}

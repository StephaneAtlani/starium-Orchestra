import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ProjectMilestonesController } from './project-milestones.controller';
import { ProjectMilestonesService } from './project-milestones.service';
import { ProjectRisksController } from './project-risks.controller';
import { ProjectRisksService } from './project-risks.service';
import { ProjectTasksController } from './project-tasks.controller';
import { ProjectTasksService } from './project-tasks.service';
import { ProjectsController } from './projects.controller';
import { ProjectsPilotageService } from './projects-pilotage.service';
import { ProjectsService } from './projects.service';

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [
    ProjectsController,
    ProjectTasksController,
    ProjectRisksController,
    ProjectMilestonesController,
  ],
  providers: [
    ProjectsService,
    ProjectsPilotageService,
    ProjectTasksService,
    ProjectRisksService,
    ProjectMilestonesService,
  ],
  exports: [ProjectsService, ProjectsPilotageService],
})
export class ProjectsModule {}

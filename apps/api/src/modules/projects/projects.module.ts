import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ProjectActivitiesController } from './project-activities.controller';
import { ProjectActivitiesService } from './project-activities.service';
import { ProjectGanttController } from './project-gantt.controller';
import { ProjectGanttService } from './project-gantt.service';
import { ProjectMilestonesController } from './project-milestones.controller';
import { ProjectMilestonesService } from './project-milestones.service';
import { ProjectPortfolioCategoriesController } from './project-portfolio-categories.controller';
import { ProjectPortfolioCategoriesService } from './project-portfolio-categories.service';
import { ProjectRisksController } from './project-risks.controller';
import { ProjectRisksService } from './project-risks.service';
import { ProjectSheetDecisionSnapshotsController } from './project-sheet/project-sheet-decision-snapshots.controller';
import { ProjectSheetDecisionSnapshotsService } from './project-sheet/project-sheet-decision-snapshots.service';
import { ProjectSheetController } from './project-sheet/project-sheet.controller';
import { ProjectSheetService } from './project-sheet/project-sheet.service';
import { ProjectReviewsController } from './project-reviews/project-reviews.controller';
import { ProjectReviewsService } from './project-reviews/project-reviews.service';
import { ProjectDocumentsController } from './project-documents.controller';
import { ProjectDocumentsService } from './project-documents.service';
import { ProjectDocumentContentService } from './project-document-content.service';
import { ProjectTaskBucketsController } from './project-task-buckets.controller';
import { ProjectTaskBucketsService } from './project-task-buckets.service';
import { ProjectTasksController } from './project-tasks.controller';
import { ProjectTasksService } from './project-tasks.service';
import { ProjectsController } from './projects.controller';
import { ProjectsPilotageService } from './projects-pilotage.service';
import { ProjectsService } from './projects.service';
import { ProjectTeamService } from './project-team.service';

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [
    /** Routes `projects/:id/...` (ex. project-sheet) avant `projects/:id` pour éviter les collisions de matching. */
    ProjectSheetController,
    ProjectSheetDecisionSnapshotsController,
    ProjectReviewsController,
    ProjectPortfolioCategoriesController,
    ProjectsController,
    ProjectDocumentsController,
    ProjectTaskBucketsController,
    ProjectTasksController,
    ProjectActivitiesController,
    ProjectGanttController,
    ProjectRisksController,
    ProjectMilestonesController,
  ],
  providers: [
    ProjectsService,
    ProjectsPilotageService,
    ProjectSheetService,
    ProjectSheetDecisionSnapshotsService,
    ProjectReviewsService,
    ProjectPortfolioCategoriesService,
    ProjectDocumentsService,
    ProjectDocumentContentService,
    ProjectTaskBucketsService,
    ProjectTasksService,
    ProjectActivitiesService,
    ProjectGanttService,
    ProjectRisksService,
    ProjectMilestonesService,
    ProjectTeamService,
  ],
  exports: [
    ProjectsService,
    ProjectsPilotageService,
    ProjectTeamService,
    ProjectDocumentContentService,
  ],
})
export class ProjectsModule {}

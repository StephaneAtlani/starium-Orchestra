import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { TeamAssignmentsModule } from '../team-assignments/team-assignments.module';
import { ProjectActivitiesController } from './project-activities.controller';
import { ProjectActivitiesService } from './project-activities.service';
import { ProjectGanttController } from './project-gantt.controller';
import { ProjectGanttService } from './project-gantt.service';
import { ProjectMilestonesController } from './project-milestones.controller';
import { ProjectMilestonesService } from './project-milestones.service';
import { ProjectPortfolioCategoriesController } from './project-portfolio-categories.controller';
import { ProjectPortfolioCategoriesService } from './project-portfolio-categories.service';
import { ClientScopedRisksService } from './client-scoped-risks.service';
import { ProjectRisksController } from './project-risks.controller';
import { ProjectRisksService } from './project-risks.service';
import { RisksController } from './risks.controller';
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
import { ProjectTaskLabelsController } from './project-task-labels.controller';
import { ProjectTaskLabelsService } from './project-task-labels.service';
import { ProjectTaskPhasesController } from './project-task-phases.controller';
import { ProjectTaskPhasesService } from './project-task-phases.service';
import { ProjectTasksController } from './project-tasks.controller';
import { ProjectTasksService } from './project-tasks.service';
import { ProjectsController } from './projects.controller';
import { ProjectsPilotageService } from './projects-pilotage.service';
import { ProjectsService } from './projects.service';
import { ProjectTeamService } from './project-team.service';
import { ProjectMilestoneLabelsController } from './project-milestone-labels.controller';
import { ProjectMilestoneLabelsService } from './project-milestone-labels.service';
import { RiskTaxonomyModule } from '../risk-taxonomy/risk-taxonomy.module';
import { ResourcesModule } from '../resources/resources.module';
import { ActionPlanTasksController } from './action-plan-tasks.controller';
import { ActionPlansController } from './action-plans.controller';
import { ActionPlansService } from './action-plans.service';
import { ProjectResourceAssignmentsController } from './project-resource-assignments.controller';

@Module({
  imports: [
    PrismaModule,
    AuditLogsModule,
    RiskTaxonomyModule,
    ResourcesModule,
    TeamAssignmentsModule,
  ],
  controllers: [
    /** RFC-TEAM-008 — `projects/:projectId/resource-assignments/...` avant routes `projects/:id` génériques. */
    ProjectResourceAssignmentsController,
    /** Routes `action-plans/:id/tasks/...` avant `action-plans/:id`. */
    ActionPlanTasksController,
    ActionPlansController,
    /** Routes `projects/:id/...` (ex. project-sheet) avant `projects/:id` pour éviter les collisions de matching. */
    ProjectSheetController,
    ProjectSheetDecisionSnapshotsController,
    ProjectReviewsController,
    ProjectPortfolioCategoriesController,
    ProjectsController,
    ProjectDocumentsController,
    ProjectTaskBucketsController,
    ProjectTaskLabelsController,
    ProjectTaskPhasesController,
    ProjectTasksController,
    ProjectActivitiesController,
    ProjectGanttController,
    RisksController,
    ProjectRisksController,
    ProjectMilestonesController,
    ProjectMilestoneLabelsController,
  ],
  providers: [
    ActionPlansService,
    ProjectsService,
    ProjectsPilotageService,
    ProjectSheetService,
    ProjectSheetDecisionSnapshotsService,
    ProjectReviewsService,
    ProjectPortfolioCategoriesService,
    ProjectDocumentsService,
    ProjectDocumentContentService,
    ProjectTaskBucketsService,
    ProjectTaskLabelsService,
    ProjectTaskPhasesService,
    ProjectTasksService,
    ProjectActivitiesService,
    ProjectGanttService,
    ClientScopedRisksService,
    ProjectRisksService,
    ProjectMilestonesService,
    ProjectTeamService,
    ProjectMilestoneLabelsService,
  ],
  exports: [
    ProjectsService,
    ProjectsPilotageService,
    ProjectTeamService,
    ProjectDocumentContentService,
  ],
})
export class ProjectsModule {}

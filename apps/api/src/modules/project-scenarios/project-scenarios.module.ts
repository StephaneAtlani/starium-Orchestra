import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ProjectScenariosController } from './project-scenarios.controller';
import { ProjectScenarioFinancialLinesController } from './project-scenario-financial-lines.controller';
import { ProjectScenarioFinancialLinesService } from './project-scenario-financial-lines.service';
import { ProjectScenarioCapacityController } from './project-scenario-capacity.controller';
import { ProjectScenarioCapacityService } from './project-scenario-capacity.service';
import { ProjectScenarioResourcePlansController } from './project-scenario-resource-plans.controller';
import { ProjectScenarioResourcePlansService } from './project-scenario-resource-plans.service';
import { ProjectScenarioTasksController } from './project-scenario-tasks.controller';
import { ProjectScenarioTasksService } from './project-scenario-tasks.service';
import { ProjectScenariosService } from './project-scenarios.service';

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [
    ProjectScenariosController,
    ProjectScenarioFinancialLinesController,
    ProjectScenarioCapacityController,
    ProjectScenarioResourcePlansController,
    ProjectScenarioTasksController,
  ],
  providers: [
    ProjectScenariosService,
    ProjectScenarioFinancialLinesService,
    ProjectScenarioCapacityService,
    ProjectScenarioResourcePlansService,
    ProjectScenarioTasksService,
  ],
  exports: [
    ProjectScenariosService,
    ProjectScenarioFinancialLinesService,
    ProjectScenarioCapacityService,
    ProjectScenarioResourcePlansService,
    ProjectScenarioTasksService,
  ],
})
export class ProjectScenariosModule {}

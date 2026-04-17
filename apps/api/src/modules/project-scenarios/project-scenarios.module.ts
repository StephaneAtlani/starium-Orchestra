import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { RiskTaxonomyModule } from '../risk-taxonomy/risk-taxonomy.module';
import { ProjectScenariosController } from './project-scenarios.controller';
import { ProjectScenarioRisksController } from './project-scenario-risks.controller';
import { ProjectScenarioFinancialLinesController } from './project-scenario-financial-lines.controller';
import { ProjectScenarioFinancialLinesService } from './project-scenario-financial-lines.service';
import { ProjectScenarioCapacityController } from './project-scenario-capacity.controller';
import { ProjectScenarioCapacityService } from './project-scenario-capacity.service';
import { ProjectScenarioResourcePlansController } from './project-scenario-resource-plans.controller';
import { ProjectScenarioResourcePlansService } from './project-scenario-resource-plans.service';
import { ProjectScenarioTasksController } from './project-scenario-tasks.controller';
import { ProjectScenarioRisksService } from './project-scenario-risks.service';
import { ProjectScenarioTasksService } from './project-scenario-tasks.service';
import { ProjectScenariosService } from './project-scenarios.service';

@Module({
  imports: [PrismaModule, AuditLogsModule, RiskTaxonomyModule],
  controllers: [
    ProjectScenariosController,
    ProjectScenarioFinancialLinesController,
    ProjectScenarioCapacityController,
    ProjectScenarioResourcePlansController,
    ProjectScenarioRisksController,
    ProjectScenarioTasksController,
  ],
  providers: [
    ProjectScenariosService,
    ProjectScenarioFinancialLinesService,
    ProjectScenarioCapacityService,
    ProjectScenarioResourcePlansService,
    ProjectScenarioRisksService,
    ProjectScenarioTasksService,
  ],
  exports: [
    ProjectScenariosService,
    ProjectScenarioFinancialLinesService,
    ProjectScenarioCapacityService,
    ProjectScenarioResourcePlansService,
    ProjectScenarioRisksService,
    ProjectScenarioTasksService,
  ],
})
export class ProjectScenariosModule {}

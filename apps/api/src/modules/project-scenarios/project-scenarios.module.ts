import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ProjectScenariosController } from './project-scenarios.controller';
import { ProjectScenarioFinancialLinesController } from './project-scenario-financial-lines.controller';
import { ProjectScenarioFinancialLinesService } from './project-scenario-financial-lines.service';
import { ProjectScenariosService } from './project-scenarios.service';

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [ProjectScenariosController, ProjectScenarioFinancialLinesController],
  providers: [ProjectScenariosService, ProjectScenarioFinancialLinesService],
  exports: [ProjectScenariosService, ProjectScenarioFinancialLinesService],
})
export class ProjectScenariosModule {}

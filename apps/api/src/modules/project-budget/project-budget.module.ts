import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ProjectsModule } from '../projects/projects.module';
import { ProjectBudgetLinkByIdController } from './project-budget-link-by-id.controller';
import { ProjectBudgetLinksController } from './project-budget-links.controller';
import { ProjectBudgetLinksService } from './project-budget-links.service';

@Module({
  imports: [PrismaModule, AuditLogsModule, forwardRef(() => ProjectsModule)],
  controllers: [ProjectBudgetLinksController, ProjectBudgetLinkByIdController],
  providers: [ProjectBudgetLinksService],
  exports: [ProjectBudgetLinksService],
})
export class ProjectBudgetModule {}

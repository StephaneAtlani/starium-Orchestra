import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { CollaboratorSkillsController } from './collaborator-skills.controller';
import { CollaboratorSkillsService } from './collaborator-skills.service';
import { SkillCategoriesController } from './skill-categories.controller';
import { SkillsController } from './skills.controller';
import { SkillsService } from './skills.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [
    SkillsController,
    SkillCategoriesController,
    CollaboratorSkillsController,
  ],
  providers: [SkillsService, CollaboratorSkillsService],
  exports: [SkillsService, CollaboratorSkillsService],
})
export class SkillsModule {}

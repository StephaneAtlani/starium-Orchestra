import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { SkillCategoriesController } from './skill-categories.controller';
import { SkillsController } from './skills.controller';
import { SkillsService } from './skills.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [SkillsController, SkillCategoriesController],
  providers: [SkillsService],
  exports: [SkillsService],
})
export class SkillsModule {}

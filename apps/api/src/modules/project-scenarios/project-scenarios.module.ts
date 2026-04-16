import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ProjectScenariosController } from './project-scenarios.controller';
import { ProjectScenariosService } from './project-scenarios.service';

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [ProjectScenariosController],
  providers: [ProjectScenariosService],
  exports: [ProjectScenariosService],
})
export class ProjectScenariosModule {}

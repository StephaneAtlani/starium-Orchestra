import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { CollaboratorsModule } from '../collaborators/collaborators.module';
import { ResourceRolesController } from './resource-roles.controller';
import { ResourceRolesService } from './resource-roles.service';
import { ResourcesController } from './resources.controller';
import { ResourcesModuleBootstrapService } from './resources-module-bootstrap.service';
import { ResourcesService } from './resources.service';

@Module({
  imports: [PrismaModule, AuditLogsModule, CollaboratorsModule],
  controllers: [ResourcesController, ResourceRolesController],
  providers: [
    ResourcesService,
    ResourceRolesService,
    ResourcesModuleBootstrapService,
  ],
  exports: [ResourcesModuleBootstrapService, ResourcesService],
})
export class ResourcesModule {}

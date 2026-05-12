import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { OrganizationGroupsController } from './organization-groups.controller';
import { OrganizationGroupsService } from './organization-groups.service';
import { OrganizationUnitsController } from './organization-units.controller';
import { OrganizationUnitsService } from './organization-units.service';

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [OrganizationUnitsController, OrganizationGroupsController],
  providers: [OrganizationUnitsService, OrganizationGroupsService],
})
export class OrganizationModule {}

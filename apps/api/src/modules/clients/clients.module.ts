import { Module } from '@nestjs/common';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { RolesModule } from '../roles/roles.module';
import { ProjectsModule } from '../projects/projects.module';
import { ResourcesModule } from '../resources/resources.module';
import { ClientsController } from './clients.controller';
import { ClientMembershipService } from './client-membership.service';
import { ClientsService } from './clients.service';
import { ClientModulesController } from './client-modules.controller';
import { ClientModulesService } from './client-modules.service';
import { ClientTaxSettingsController } from './client-tax-settings.controller';
import { ClientTaxSettingsService } from './client-tax-settings.service';
import { ClientBudgetWorkflowSettingsController } from './client-budget-workflow-settings.controller';
import { ClientBudgetWorkflowSettingsService } from './client-budget-workflow-settings.service';
import { ClientResourceTimesheetSettingsController } from './client-resource-timesheet-settings.controller';
import { ClientResourceTimesheetSettingsService } from './client-resource-timesheet-settings.service';
import { ClientUiBadgesController } from './client-ui-badges.controller';
import { ClientUiBadgesService } from './client-ui-badges.service';
import { PlatformUiBadgeSettingsController } from './platform-ui-badge-settings.controller';
import { PlatformUiBadgeSettingsService } from './platform-ui-badge-settings.service';
import { ClientAdminGuard } from '../../common/guards/client-admin.guard';
import { RiskTaxonomyModule } from '../risk-taxonomy/risk-taxonomy.module';
import { ActivityTypesModule } from '../activity-types/activity-types.module';
import { ProcurementModule } from '../procurement/procurement.module';

@Module({
  imports: [
    AuthModule,
    PrismaModule,
    AuditLogsModule,
    RolesModule,
    ProjectsModule,
    ResourcesModule,
    ProcurementModule,
    RiskTaxonomyModule,
    ActivityTypesModule,
  ],
  controllers: [
    ClientsController,
    ClientModulesController,
    ClientTaxSettingsController,
    ClientBudgetWorkflowSettingsController,
    ClientResourceTimesheetSettingsController,
    ClientUiBadgesController,
    PlatformUiBadgeSettingsController,
  ],
  providers: [
    ClientsService,
    ClientMembershipService,
    ClientModulesService,
    PlatformAdminGuard,
    ClientTaxSettingsService,
    ClientBudgetWorkflowSettingsService,
    ClientResourceTimesheetSettingsService,
    ClientUiBadgesService,
    PlatformUiBadgeSettingsService,
    ClientAdminGuard,
    ActiveClientGuard,
    ModuleAccessGuard,
    PermissionsGuard,
  ],
  exports: [
    ClientsService,
    ClientMembershipService,
    ClientModulesService,
    ClientBudgetWorkflowSettingsService,
  ],
})
export class ClientsModule {}


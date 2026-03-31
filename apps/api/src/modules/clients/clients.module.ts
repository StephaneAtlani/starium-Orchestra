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
import { ClientUiBadgesController } from './client-ui-badges.controller';
import { ClientUiBadgesService } from './client-ui-badges.service';
import { PlatformUiBadgeSettingsController } from './platform-ui-badge-settings.controller';
import { PlatformUiBadgeSettingsService } from './platform-ui-badge-settings.service';
import { ClientAdminGuard } from '../../common/guards/client-admin.guard';
import { RiskTaxonomyModule } from '../risk-taxonomy/risk-taxonomy.module';

@Module({
  imports: [
    AuthModule,
    PrismaModule,
    AuditLogsModule,
    RolesModule,
    ProjectsModule,
    ResourcesModule,
    RiskTaxonomyModule,
  ],
  controllers: [
    ClientsController,
    ClientModulesController,
    ClientTaxSettingsController,
    ClientUiBadgesController,
    PlatformUiBadgeSettingsController,
  ],
  providers: [
    ClientsService,
    ClientMembershipService,
    ClientModulesService,
    PlatformAdminGuard,
    ClientTaxSettingsService,
    ClientUiBadgesService,
    PlatformUiBadgeSettingsService,
    ClientAdminGuard,
    ActiveClientGuard,
    ModuleAccessGuard,
    PermissionsGuard,
  ],
  exports: [ClientsService, ClientMembershipService, ClientModulesService],
})
export class ClientsModule {}


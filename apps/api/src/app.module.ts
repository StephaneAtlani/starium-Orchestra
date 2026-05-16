import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { CommonModule } from './common/common.module';
import { AuthModule } from './modules/auth/auth.module';
import { ClientsModule } from './modules/clients/clients.module';
import { HealthModule } from './health/health.module';
import { MeModule } from './modules/me/me.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { RolesModule } from './modules/roles/roles.module';
import { RbacTestModule } from './modules/rbac-test/rbac-test.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { FinancialCoreModule } from './modules/financial-core/financial-core.module';
import { BudgetManagementModule } from './modules/budget-management/budget-management.module';
import { BudgetSnapshotsModule } from './modules/budget-snapshots/budget-snapshots.module';
import { BudgetReportingModule } from './modules/budget-reporting/budget-reporting.module';
import { BudgetReallocationModule } from './modules/budget-reallocation/budget-reallocation.module';
import { BudgetImportModule } from './modules/budget-import/budget-import.module';
import { BudgetVersioningModule } from './modules/budget-versioning/budget-versioning.module';
import { BudgetDashboardModule } from './modules/budget-dashboard/budget-dashboard.module';
import { SecurityLogsModule } from './modules/security-logs/security-logs.module';
import { ProcurementModule } from './modules/procurement/procurement.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { ProjectBudgetModule } from './modules/project-budget/project-budget.module';
import { ResourcesModule } from './modules/resources/resources.module';
import { MicrosoftModule } from './modules/microsoft/microsoft.module';
import { CollaboratorsModule } from './modules/collaborators/collaborators.module';
import { TeamDirectoryModule } from './modules/team-directory/team-directory.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { RiskTaxonomyModule } from './modules/risk-taxonomy/risk-taxonomy.module';
import { BudgetForecastModule } from './modules/budget-forecast/budget-forecast.module';
import { PlatformUsageModule } from './modules/platform-usage/platform-usage.module';
import { SkillsModule } from './modules/skills/skills.module';
import { WorkTeamsModule } from './modules/work-teams/work-teams.module';
import { ActivityTypesModule } from './modules/activity-types/activity-types.module';
import { ResourceTimeEntriesModule } from './modules/resource-time-entries/resource-time-entries.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { StrategicDirectionStrategyModule } from './modules/strategic-direction-strategy/strategic-direction-strategy.module';
import { StrategicVisionModule } from './modules/strategic-vision/strategic-vision.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { QueueModule } from './modules/queue/queue.module';
import { EmailModule } from './modules/email/email.module';
import { ChatbotModule } from './modules/chatbot/chatbot.module';
import { SearchModule } from './modules/search/search.module';
import { LicensesModule } from './modules/licenses/licenses.module';
import { LicenseReportingModule } from './modules/license-reporting/license-reporting.module';
import { AccessGroupsModule } from './modules/access-groups/access-groups.module';
import { AccessControlModule } from './modules/access-control/access-control.module';
import { AccessDiagnosticsModule } from './modules/access-diagnostics/access-diagnostics.module';
import { AccessModelModule } from './modules/access-model/access-model.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { FeatureFlagsModule } from './modules/feature-flags/feature-flags.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // .env depuis apps/api ; ../.env = racine monorepo (PORT=3001, etc.)
      envFilePath: ['.env', '../.env', 'apps/api/.env'],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    FeatureFlagsModule,
    CommonModule,
    HealthModule,
    AuthModule,
    MeModule,
    UsersModule,
    ClientsModule,
    RolesModule,
    RbacTestModule,
    AuditLogsModule,
    FinancialCoreModule,
    BudgetManagementModule,
    BudgetSnapshotsModule,
    BudgetReportingModule,
    BudgetReallocationModule,
    BudgetImportModule,
    BudgetVersioningModule,
    BudgetDashboardModule,
    SecurityLogsModule,
    ProcurementModule,
    ProjectsModule,
    ProjectBudgetModule,
    ResourcesModule,
    MicrosoftModule,
    CollaboratorsModule,
    TeamDirectoryModule,
    ComplianceModule,
    RiskTaxonomyModule,
    BudgetForecastModule,
    PlatformUsageModule,
    SkillsModule,
    WorkTeamsModule,
    ActivityTypesModule,
    ResourceTimeEntriesModule,
    ContractsModule,
    StrategicDirectionStrategyModule,
    StrategicVisionModule,
    QueueModule,
    EmailModule,
    AlertsModule,
    NotificationsModule,
    ChatbotModule,
    SearchModule,
    LicensesModule,
    LicenseReportingModule,
    AccessGroupsModule,
    AccessControlModule,
    AccessDiagnosticsModule,
    AccessModelModule,
    OrganizationModule,
  ],
})
export class AppModule {}

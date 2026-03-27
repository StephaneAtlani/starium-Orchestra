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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // .env depuis apps/api ; ../.env = racine monorepo (PORT=3001, etc.)
      envFilePath: ['.env', '../.env', 'apps/api/.env'],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
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
  ],
})
export class AppModule {}

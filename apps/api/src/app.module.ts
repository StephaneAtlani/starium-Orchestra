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
import { SecurityLogsModule } from './modules/security-logs/security-logs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'apps/api/.env'],
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
    SecurityLogsModule,
  ],
})
export class AppModule {}

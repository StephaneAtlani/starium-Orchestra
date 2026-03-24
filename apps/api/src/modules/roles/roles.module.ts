import { Module } from '@nestjs/common';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ClientAdminGuard } from '../../common/guards/client-admin.guard';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { DefaultProfilesService } from './default-profiles.service';
import { PlatformRolesController } from './platform-roles.controller';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

@Module({
  imports: [AuthModule, PrismaModule, AuditLogsModule],
  controllers: [RolesController, PlatformRolesController],
  providers: [
    RolesService,
    DefaultProfilesService,
    ActiveClientGuard,
    ClientAdminGuard,
    PlatformAdminGuard,
  ],
  exports: [RolesService, DefaultProfilesService],
})
export class RolesModule {}


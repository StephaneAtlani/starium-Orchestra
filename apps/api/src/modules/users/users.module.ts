import { Module } from '@nestjs/common';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ClientAdminGuard } from '../../common/guards/client-admin.guard';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { AuthModule } from '../auth/auth.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { CollaboratorsModule } from '../collaborators/collaborators.module';
import { PlatformClientUsersController } from './platform-client-users.controller';
import { PlatformUsersController } from './platform-users.controller';
import { UserRolesController } from './user-roles.controller';
import { UserRolesService } from './user-roles.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [AuthModule, AuditLogsModule, CollaboratorsModule],
  controllers: [
    UsersController,
    PlatformUsersController,
    PlatformClientUsersController,
    UserRolesController,
  ],
  providers: [
    UsersService,
    UserRolesService,
    ActiveClientGuard,
    ClientAdminGuard,
    PlatformAdminGuard,
  ],
  exports: [UsersService, UserRolesService],
})
export class UsersModule {}


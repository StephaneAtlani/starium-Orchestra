import { Module } from '@nestjs/common';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ClientAdminGuard } from '../../common/guards/client-admin.guard';
import { AuthModule } from '../auth/auth.module';
import { PlatformUsersController } from './platform-users.controller';
import { UserRolesController } from './user-roles.controller';
import { UserRolesService } from './user-roles.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [AuthModule],
  controllers: [UsersController, PlatformUsersController, UserRolesController],
  providers: [
    UsersService,
    UserRolesService,
    ActiveClientGuard,
    ClientAdminGuard,
  ],
  exports: [UsersService, UserRolesService],
})
export class UsersModule {}


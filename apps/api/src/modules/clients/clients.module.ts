import { Module } from '@nestjs/common';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ClientsController } from './clients.controller';
import { ClientMembershipService } from './client-membership.service';
import { ClientsService } from './clients.service';
import { ClientModulesController } from './client-modules.controller';
import { ClientModulesService } from './client-modules.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [ClientsController, ClientModulesController],
  providers: [
    ClientsService,
    ClientMembershipService,
    ClientModulesService,
    PlatformAdminGuard,
  ],
  exports: [ClientsService, ClientMembershipService, ClientModulesService],
})
export class ClientsModule {}


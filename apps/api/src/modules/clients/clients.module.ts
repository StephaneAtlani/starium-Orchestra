import { Module } from '@nestjs/common';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ClientsController } from './clients.controller';
import { ClientMembershipService } from './client-membership.service';
import { ClientsService } from './clients.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [ClientsController],
  providers: [ClientsService, ClientMembershipService, PlatformAdminGuard],
  exports: [ClientsService, ClientMembershipService],
})
export class ClientsModule {}

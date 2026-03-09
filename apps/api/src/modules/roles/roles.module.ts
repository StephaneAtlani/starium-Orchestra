import { Module } from '@nestjs/common';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ClientAdminGuard } from '../../common/guards/client-admin.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [RolesController],
  providers: [RolesService, ActiveClientGuard, ClientAdminGuard],
  exports: [RolesService],
})
export class RolesModule {}


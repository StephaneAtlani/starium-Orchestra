import { Module } from '@nestjs/common';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { RbacTestController } from './rbac-test.controller';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [RbacTestController],
  providers: [ActiveClientGuard, ModuleAccessGuard, PermissionsGuard],
})
export class RbacTestModule {}


import { Module } from '@nestjs/common';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { AuthModule } from '../auth/auth.module';
import { FeatureFlagsModule } from '../feature-flags/feature-flags.module';
import { AccessModelController } from './access-model.controller';
import { AccessModelService } from './access-model.service';

@Module({
  imports: [PrismaModule, AuthModule, FeatureFlagsModule, AuditLogsModule],
  controllers: [AccessModelController],
  providers: [AccessModelService, PermissionsGuard],
  exports: [AccessModelService],
})
export class AccessModelModule {}

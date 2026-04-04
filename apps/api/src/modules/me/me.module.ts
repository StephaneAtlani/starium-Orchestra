import { Module } from '@nestjs/common';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { AuthModule } from '../auth/auth.module';
import { MfaModule } from '../mfa/mfa.module';
import { ResourceTimesheetMonthsModule } from '../resource-time-entries/resource-timesheet-months.module';
import { SecurityLogsModule } from '../security-logs/security-logs.module';
import { MeController } from './me.controller';
import { MeService } from './me.service';
import { MeAvatarStorageService } from './me-avatar.storage';

@Module({
  imports: [AuthModule, MfaModule, SecurityLogsModule, ResourceTimesheetMonthsModule],
  controllers: [MeController],
  providers: [MeService, MeAvatarStorageService, ActiveClientGuard],
  exports: [MeService],
})
export class MeModule {}

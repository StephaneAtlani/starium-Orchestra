import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { StrategicDirectionStrategyController } from './strategic-direction-strategy.controller';
import { StrategicDirectionStrategyService } from './strategic-direction-strategy.service';

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [StrategicDirectionStrategyController],
  providers: [StrategicDirectionStrategyService],
  exports: [StrategicDirectionStrategyService],
})
export class StrategicDirectionStrategyModule {}

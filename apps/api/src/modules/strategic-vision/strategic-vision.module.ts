import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { StrategicVisionController } from './strategic-vision.controller';
import { StrategicVisionService } from './strategic-vision.service';
import { AccessControlModule } from '../access-control/access-control.module';

@Module({
  imports: [PrismaModule, AuditLogsModule, AccessControlModule],
  controllers: [StrategicVisionController],
  providers: [StrategicVisionService],
  exports: [StrategicVisionService],
})
export class StrategicVisionModule {}

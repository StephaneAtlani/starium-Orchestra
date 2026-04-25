import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { StrategicVisionController } from './strategic-vision.controller';
import { StrategicVisionService } from './strategic-vision.service';

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [StrategicVisionController],
  providers: [StrategicVisionService],
  exports: [StrategicVisionService],
})
export class StrategicVisionModule {}

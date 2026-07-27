import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AccessDecisionModule } from '../access-decision/access-decision.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { MeetingTemplatesController } from './meeting-templates.controller';
import { MeetingTemplatesService } from './meeting-templates.service';
import { MeetingsController } from './meetings.controller';
import { MeetingsService } from './meetings.service';

/**
 * RFC-MEET-001 — module Réunions de gouvernance.
 *
 * Surcouche : il orchestre le rituel (modèle, périmètre multi-projets, appel,
 * sections) sans dupliquer de donnée métier. La trace par projet reste dans
 * `ProjectReview`, la trace portefeuille dans `GovernanceCycleInstance`.
 */
@Module({
  imports: [PrismaModule, AuditLogsModule, AccessDecisionModule, CommonModule],
  controllers: [MeetingsController, MeetingTemplatesController],
  providers: [MeetingsService, MeetingTemplatesService],
  exports: [MeetingsService, MeetingTemplatesService],
})
export class MeetingsModule {}

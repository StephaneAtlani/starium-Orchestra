import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { AuditLogsService } from './audit-logs.service';
import { ListPlatformAuditLogsQueryDto } from './dto/list-platform-audit-logs.query.dto';

@Controller('platform/audit-logs')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class PlatformAuditLogsController {
  constructor(private readonly auditLogs: AuditLogsService) {}

  @Get()
  findAll(@Query() query: ListPlatformAuditLogsQueryDto) {
    return this.auditLogs.listForPlatform(query);
  }
}


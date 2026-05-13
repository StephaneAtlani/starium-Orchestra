import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import type { RequestWithClient } from '../../common/types/request-with-client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccessDiagnosticsService } from './access-diagnostics.service';
import { EffectiveRightsQueryDto } from './dto/effective-rights-query.dto';

@Controller('platform/clients/:clientId/access-diagnostics')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class PlatformAccessDiagnosticsController {
  constructor(private readonly diagnostics: AccessDiagnosticsService) {}

  @Get('effective-rights')
  getEffectiveRights(
    @Param('clientId') clientId: string,
    @Query() query: EffectiveRightsQueryDto,
    @Req() req: RequestWithClient,
  ) {
    return this.diagnostics.computeEffectiveRights({
      clientId,
      userId: query.userId,
      resourceType: query.resourceType,
      resourceId: query.resourceId,
      operation: query.operation,
      httpRequest: req,
    });
  }
}

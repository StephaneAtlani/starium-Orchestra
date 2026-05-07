import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
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
  ) {
    return this.diagnostics.computeEffectiveRights({
      clientId,
      userId: query.userId,
      resourceType: query.resourceType,
      resourceId: query.resourceId,
      operation: query.operation,
    });
  }
}

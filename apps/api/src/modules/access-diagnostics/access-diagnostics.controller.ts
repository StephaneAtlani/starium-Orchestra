import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ClientAdminGuard } from '../../common/guards/client-admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { RequestWithClient } from '../../common/types/request-with-client';
import { AccessDiagnosticsService } from './access-diagnostics.service';
import { EffectiveRightsQueryDto } from './dto/effective-rights-query.dto';

@Controller('access-diagnostics')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ClientAdminGuard)
export class AccessDiagnosticsController {
  constructor(private readonly diagnostics: AccessDiagnosticsService) {}

  @Get('effective-rights')
  getEffectiveRights(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: EffectiveRightsQueryDto,
    @Req() req: RequestWithClient,
  ) {
    return this.diagnostics.computeEffectiveRights({
      clientId: clientId!,
      userId: query.userId,
      resourceType: query.resourceType,
      resourceId: query.resourceId,
      operation: query.operation,
      httpRequest: req,
    });
  }
}

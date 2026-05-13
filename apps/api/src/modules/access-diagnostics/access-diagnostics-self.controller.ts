import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import type { RequestWithClient } from '../../common/types/request-with-client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccessDiagnosticsService } from './access-diagnostics.service';
import { MyEffectiveRightsQueryDto } from './dto/my-effective-rights-query.dto';

/**
 * RFC-ACL-014 §3 — diagnostic self-service (JWT + client actif membre, pas d’Option A plateforme).
 */
@Controller('access-diagnostics')
@UseGuards(JwtAuthGuard, ActiveClientGuard)
export class AccessDiagnosticsSelfController {
  constructor(private readonly diagnostics: AccessDiagnosticsService) {}

  @Get('effective-rights/me')
  getMyEffectiveRights(
    @ActiveClientId() clientId: string | undefined,
    @RequestUserId() userId: string | undefined,
    @Query() query: MyEffectiveRightsQueryDto,
    @RequestMeta() meta: RequestMeta,
    @Req() req: RequestWithClient,
  ) {
    return this.diagnostics.computeMyEffectiveRights({
      clientId: clientId!,
      userId: userId!,
      query,
      meta,
      httpRequest: req,
    });
  }
}

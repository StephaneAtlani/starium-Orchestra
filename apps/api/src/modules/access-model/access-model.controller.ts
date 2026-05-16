import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { RequestWithClient } from '../../common/types/request-with-client';
import { AccessModelService } from './access-model.service';
import { AccessModelIssuesQueryDto } from './dto/access-model-issues.query.dto';

@Controller('access-model')
@UseGuards(JwtAuthGuard, ActiveClientGuard, PermissionsGuard)
export class AccessModelController {
  constructor(private readonly accessModel: AccessModelService) {}

  @Get('health')
  @RequirePermissions('access_model.read')
  getHealth(
    @ActiveClientId() clientId: string | undefined,
    @Req() req: RequestWithClient,
  ) {
    return this.accessModel.getHealth(clientId!, req);
  }

  @Get('issues')
  @RequirePermissions('access_model.read')
  listIssues(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: AccessModelIssuesQueryDto,
  ) {
    return this.accessModel.listIssues(clientId!, query);
  }
}

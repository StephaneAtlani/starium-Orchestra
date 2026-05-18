import {
  Controller,
  Get,
  Query,
  Req,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { RequestWithClient } from '../../common/types/request-with-client';
import { AccessModelService } from './access-model.service';
import { AccessModelIssuesExportQueryDto } from './dto/access-model-issues-export.query.dto';
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

  @Get('issues/export')
  @RequirePermissions('access_model.read')
  async exportIssues(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: AccessModelIssuesExportQueryDto,
    @Req() req: RequestWithClient,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { buffer, filename } = await this.accessModel.exportIssuesCsv(
      clientId!,
      query,
      req,
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return new StreamableFile(buffer);
  }
}

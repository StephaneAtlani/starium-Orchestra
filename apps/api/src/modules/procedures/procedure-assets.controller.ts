import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformMaxFileInterceptor } from '../platform-upload/platform-max-file.interceptor';
import { ProcedureAssetsService } from './procedure-assets.service';

@Controller('procedures/:procedureId/assets')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class ProcedureAssetsController {
  constructor(private readonly assets: ProcedureAssetsService) {}

  @Get()
  @RequirePermissions('procedures.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Param('procedureId') procedureId: string,
  ) {
    return this.assets.list(clientId!, procedureId);
  }

  @Post('upload')
  @RequirePermissions('procedures.update')
  @UseInterceptors(PlatformMaxFileInterceptor)
  upload(
    @ActiveClientId() clientId: string | undefined,
    @Param('procedureId') procedureId: string,
    @UploadedFile() file: Express.Multer.File,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.assets.upload(
      clientId!,
      procedureId,
      file,
      actorUserId,
      meta,
    );
  }

  @Get(':assetId')
  @RequirePermissions('procedures.read')
  async download(
    @ActiveClientId() clientId: string | undefined,
    @Param('procedureId') procedureId: string,
    @Param('assetId') assetId: string,
  ) {
    const { stream, contentType, filename } =
      await this.assets.getDownloadStream(clientId!, procedureId, assetId);
    const safe = filename.replace(/["\r\n]/g, '_').slice(0, 200);
    return new StreamableFile(stream, {
      type: contentType,
      disposition: `inline; filename="${safe}"`,
    });
  }

  @Delete(':assetId')
  @RequirePermissions('procedures.update')
  delete(
    @ActiveClientId() clientId: string | undefined,
    @Param('procedureId') procedureId: string,
    @Param('assetId') assetId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.assets.delete(
      clientId!,
      procedureId,
      assetId,
      actorUserId,
      meta,
    );
  }
}

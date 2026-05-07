import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequireAnyPermissions } from '../../common/decorators/require-any-permissions.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { ContractAttachmentsService } from './contract-attachments.service';
import { PlatformMaxFileInterceptor } from '../platform-upload/platform-max-file.interceptor';
import { UploadContractAttachmentFieldsDto } from './dto/upload-contract-attachment-fields.dto';

@Controller('contracts/:contractId/attachments')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class ContractAttachmentsController {
  constructor(private readonly attachments: ContractAttachmentsService) {}

  @Get()
  @RequireAnyPermissions('contracts.read', 'contracts.update')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Param('contractId') contractId: string,
    @RequestUserId() userId: string | undefined,
  ) {
    return this.attachments.list(clientId!, contractId, userId);
  }

  @Post()
  @RequirePermissions('contracts.update')
  @UseInterceptors(PlatformMaxFileInterceptor)
  upload(
    @ActiveClientId() clientId: string | undefined,
    @Param('contractId') contractId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadContractAttachmentFieldsDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.attachments.create(clientId!, contractId, file, body, {
      actorUserId,
      meta,
    });
  }

  @Get(':attachmentId/download')
  @RequireAnyPermissions('contracts.read', 'contracts.update')
  async download(
    @ActiveClientId() clientId: string | undefined,
    @Param('contractId') contractId: string,
    @Param('attachmentId') attachmentId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const { stream, contentType, filename } =
      await this.attachments.getDownloadStream(
        clientId!,
        contractId,
        attachmentId,
        { actorUserId, meta },
      );
    const safe = filename.replace(/["\r\n]/g, '_').slice(0, 200);
    return new StreamableFile(stream, {
      type: contentType,
      disposition: `attachment; filename="${safe}"`,
    });
  }

  @Patch(':attachmentId/archive')
  @RequirePermissions('contracts.update')
  archive(
    @ActiveClientId() clientId: string | undefined,
    @Param('contractId') contractId: string,
    @Param('attachmentId') attachmentId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.attachments.archive(clientId!, contractId, attachmentId, {
      actorUserId,
      meta,
    });
  }
}

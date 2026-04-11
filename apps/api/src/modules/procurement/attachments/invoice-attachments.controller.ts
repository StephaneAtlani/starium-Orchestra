import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequireAnyPermissions } from '../../../common/decorators/require-any-permissions.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { ActiveClientId } from '../../../common/decorators/active-client.decorator';
import { RequestUserId } from '../../../common/decorators/request-user.decorator';
import { RequestMeta } from '../../../common/decorators/request-meta.decorator';
import { ProcurementAttachmentsService } from './procurement-attachments.service';
import { MAX_PROCUREMENT_ATTACHMENT_BYTES } from './procurement-attachments.constants';
import { UploadProcurementAttachmentFieldsDto } from './dto/upload-procurement-attachment-fields.dto';

@Controller('invoices')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class InvoiceAttachmentsController {
  constructor(private readonly attachments: ProcurementAttachmentsService) {}

  @Get(':id/attachments')
  @RequireAnyPermissions('procurement.read', 'procurement.update')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') invoiceId: string,
  ) {
    return this.attachments.listForInvoice(clientId!, invoiceId);
  }

  @Post(':id/attachments')
  @RequirePermissions('procurement.update')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_PROCUREMENT_ATTACHMENT_BYTES },
    }),
  )
  upload(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') invoiceId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadProcurementAttachmentFieldsDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.attachments.createForInvoice(
      clientId!,
      invoiceId,
      file,
      body,
      { actorUserId, meta },
    );
  }

  @Get(':id/attachments/:attachmentId/download')
  @RequireAnyPermissions('procurement.read', 'procurement.update')
  async download(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') invoiceId: string,
    @Param('attachmentId') attachmentId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const { stream, contentType, filename } =
      await this.attachments.getDownloadStreamForInvoice(
        clientId!,
        invoiceId,
        attachmentId,
        { actorUserId, meta },
      );
    const safe = filename.replace(/["\r\n]/g, '_').slice(0, 200);
    return new StreamableFile(stream, {
      type: contentType,
      disposition: `attachment; filename="${safe}"`,
    });
  }

  @Post(':id/attachments/:attachmentId/archive')
  @RequirePermissions('procurement.update')
  archive(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') invoiceId: string,
    @Param('attachmentId') attachmentId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.attachments.archiveForInvoice(
      clientId!,
      invoiceId,
      attachmentId,
      { actorUserId, meta },
    );
  }
}

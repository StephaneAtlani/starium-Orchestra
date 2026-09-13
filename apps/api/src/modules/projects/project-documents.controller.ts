import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import type { AuditContext } from '../budget-management/types/audit-context';
import { PlatformMaxFileInterceptor } from '../platform-upload/platform-max-file.interceptor';
import { CreateProjectDocumentDto } from './dto/create-project-document.dto';
import { UpdateProjectDocumentDto } from './dto/update-project-document.dto';
import { ListProjectDocumentsQueryDto } from './dto/list-project-documents-query.dto';
import { UploadProjectDocumentFieldsDto } from './dto/upload-project-document-fields.dto';
import { ProjectDocumentsService } from './project-documents.service';

@Controller('projects/:projectId/documents')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class ProjectDocumentsController {
  constructor(private readonly documents: ProjectDocumentsService) {}

  @Get()
  @RequirePermissions('projects.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Query() query: ListProjectDocumentsQueryDto,
    @RequestUserId() userId: string | undefined,
  ) {
    return this.documents.list(clientId!, projectId, userId, query);
  }

  @Post('upload')
  @RequirePermissions('projects.update')
  @UseInterceptors(PlatformMaxFileInterceptor)
  upload(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadProjectDocumentFieldsDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.documents.upload(clientId!, projectId, file, body, context);
  }

  @Get(':documentId/download')
  @RequirePermissions('projects.read')
  async download(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('documentId') documentId: string,
    @RequestUserId() userId: string | undefined,
  ) {
    const { stream, contentType, filename } = await this.documents.getDownloadStream(
      clientId!,
      projectId,
      documentId,
      userId,
    );
    const safe = filename.replace(/["\r\n]/g, '_').slice(0, 200);
    return new StreamableFile(stream, {
      type: contentType,
      disposition: `attachment; filename="${safe}"`,
    });
  }

  @Get(':documentId')
  @RequirePermissions('projects.read')
  getOne(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('documentId') documentId: string,
    @RequestUserId() userId: string | undefined,
  ) {
    return this.documents.getOne(clientId!, projectId, documentId, userId);
  }

  @Post()
  @RequirePermissions('projects.update')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Body() dto: CreateProjectDocumentDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.documents.create(clientId!, projectId, dto, context);
  }

  @Patch(':documentId')
  @RequirePermissions('projects.update')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('documentId') documentId: string,
    @Body() dto: UpdateProjectDocumentDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.documents.update(clientId!, projectId, documentId, dto, context);
  }

  @Post(':documentId/archive')
  @RequirePermissions('projects.update')
  archive(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('documentId') documentId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.documents.archive(clientId!, projectId, documentId, context);
  }

  @Delete(':documentId')
  @RequirePermissions('projects.update')
  delete(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('documentId') documentId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.documents.delete(clientId!, projectId, documentId, context);
  }
}

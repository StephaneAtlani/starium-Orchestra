import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import {
  RequestMeta,
  RequestMeta as RequestMetaDecorator,
} from '../../common/decorators/request-meta.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ActiveClientOrPlatformContextGuard } from '../../common/guards/active-client-or-platform-context.guard';
import { ClientAdminGuard } from '../../common/guards/client-admin.guard';
import { ClientAdminOrPlatformAdminGuard } from '../../common/guards/client-admin-or-platform-admin.guard';
import type { RequestWithClient } from '../../common/types/request-with-client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccessControlService } from './access-control.service';
import {
  CreateResourceAclEntryDto,
  ReplaceResourceAclEntriesDto,
} from './dto/resource-acl-entry.dto';
import { UpdateResourceAccessPolicyDto } from './dto/resource-access-policy.dto';

function parseForceQuery(raw?: string): boolean {
  if (raw === undefined || raw === '') return false;
  const v = String(raw).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

/**
 * RFC-ACL-005 + RFC-ACL-014 : GET = CLIENT_ADMIN + client actif ; mutations = Option A + query `force`.
 */
@Controller('resource-acl')
export class ResourceAclController {
  constructor(private readonly accessControl: AccessControlService) {}

  @UseGuards(JwtAuthGuard, ActiveClientGuard, ClientAdminGuard)
  @Get(':resourceType/:resourceId')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
    @RequestUserId() viewerUserId: string | undefined,
  ) {
    return this.accessControl.listEntries(
      clientId!,
      resourceType,
      resourceId,
      viewerUserId,
    );
  }

  @UseGuards(
    JwtAuthGuard,
    ActiveClientOrPlatformContextGuard,
    ClientAdminOrPlatformAdminGuard,
  )
  @Patch(':resourceType/:resourceId/access-policy')
  updateAccessPolicy(
    @ActiveClientId() clientId: string | undefined,
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
    @Body() dto: UpdateResourceAccessPolicyDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMetaDecorator() meta: RequestMeta,
    @Req() req: RequestWithClient,
    @Query('force') forceRaw?: string,
  ) {
    return this.accessControl.upsertAccessPolicy(
      clientId!,
      resourceType,
      resourceId,
      dto.mode,
      {
        actorUserId,
        meta,
        force: parseForceQuery(forceRaw),
        platformRole: req.user?.platformRole ?? null,
      },
    );
  }

  @UseGuards(
    JwtAuthGuard,
    ActiveClientOrPlatformContextGuard,
    ClientAdminOrPlatformAdminGuard,
  )
  @Put(':resourceType/:resourceId')
  replace(
    @ActiveClientId() clientId: string | undefined,
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
    @Body() dto: ReplaceResourceAclEntriesDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMetaDecorator() meta: RequestMeta,
    @Req() req: RequestWithClient,
    @Query('force') forceRaw?: string,
  ) {
    return this.accessControl.replaceEntries(
      clientId!,
      resourceType,
      resourceId,
      dto.entries,
      {
        actorUserId,
        meta,
        force: parseForceQuery(forceRaw),
        platformRole: req.user?.platformRole ?? null,
      },
    );
  }

  @UseGuards(
    JwtAuthGuard,
    ActiveClientOrPlatformContextGuard,
    ClientAdminOrPlatformAdminGuard,
  )
  @Post(':resourceType/:resourceId/entries')
  add(
    @ActiveClientId() clientId: string | undefined,
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
    @Body() dto: CreateResourceAclEntryDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMetaDecorator() meta: RequestMeta,
    @Req() req: RequestWithClient,
    @Query('force') forceRaw?: string,
  ) {
    return this.accessControl.addEntry(clientId!, resourceType, resourceId, dto, {
      actorUserId,
      meta,
      force: parseForceQuery(forceRaw),
      platformRole: req.user?.platformRole ?? null,
    });
  }

  @UseGuards(
    JwtAuthGuard,
    ActiveClientOrPlatformContextGuard,
    ClientAdminOrPlatformAdminGuard,
  )
  @Delete(':resourceType/:resourceId/entries/:entryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @ActiveClientId() clientId: string | undefined,
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
    @Param('entryId') entryId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMetaDecorator() meta: RequestMeta,
    @Req() req: RequestWithClient,
    @Query('force') forceRaw?: string,
  ): Promise<void> {
    await this.accessControl.removeEntry(
      clientId!,
      resourceType,
      resourceId,
      entryId,
      {
        actorUserId,
        meta,
        force: parseForceQuery(forceRaw),
        platformRole: req.user?.platformRole ?? null,
      },
    );
  }
}

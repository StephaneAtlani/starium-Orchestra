import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import {
  RequestMeta,
  RequestMeta as RequestMetaDecorator,
} from '../../common/decorators/request-meta.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ClientAdminGuard } from '../../common/guards/client-admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccessControlService } from './access-control.service';
import {
  CreateResourceAclEntryDto,
  ReplaceResourceAclEntriesDto,
} from './dto/resource-acl-entry.dto';

/**
 * RFC-ACL-005 — administration des ACL génériques (CLIENT_ADMIN + client actif).
 * Les paramètres `resourceType` / `resourceId` sont validés et normalisés dans le service
 * (`resolveResourceAclRoute`), de façon identique pour toutes les méthodes HTTP.
 */
@UseGuards(JwtAuthGuard, ActiveClientGuard, ClientAdminGuard)
@Controller('resource-acl')
export class ResourceAclController {
  constructor(private readonly accessControl: AccessControlService) {}

  @Get(':resourceType/:resourceId')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
  ) {
    return this.accessControl.listEntries(clientId!, resourceType, resourceId);
  }

  @Put(':resourceType/:resourceId')
  replace(
    @ActiveClientId() clientId: string | undefined,
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
    @Body() dto: ReplaceResourceAclEntriesDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMetaDecorator() meta: RequestMeta,
  ) {
    return this.accessControl.replaceEntries(
      clientId!,
      resourceType,
      resourceId,
      dto.entries,
      { actorUserId, meta },
    );
  }

  @Post(':resourceType/:resourceId/entries')
  add(
    @ActiveClientId() clientId: string | undefined,
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
    @Body() dto: CreateResourceAclEntryDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMetaDecorator() meta: RequestMeta,
  ) {
    return this.accessControl.addEntry(clientId!, resourceType, resourceId, dto, {
      actorUserId,
      meta,
    });
  }

  @Delete(':resourceType/:resourceId/entries/:entryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @ActiveClientId() clientId: string | undefined,
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
    @Param('entryId') entryId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMetaDecorator() meta: RequestMeta,
  ): Promise<void> {
    await this.accessControl.removeEntry(
      clientId!,
      resourceType,
      resourceId,
      entryId,
      { actorUserId, meta },
    );
  }
}

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
import { AccessGroupsService } from './access-groups.service';
import { AddAccessGroupMemberDto } from './dto/add-access-group-member.dto';
import { CreateAccessGroupDto } from './dto/create-access-group.dto';
import { UpdateAccessGroupDto } from './dto/update-access-group.dto';

/**
 * Groupes d'accès client (RFC-ACL-003) — admin client sur le contexte actif.
 */
@UseGuards(JwtAuthGuard, ActiveClientGuard, ClientAdminGuard)
@Controller()
export class AccessGroupsController {
  constructor(private readonly accessGroups: AccessGroupsService) {}

  @Get('access-groups')
  list(@ActiveClientId() clientId: string | undefined) {
    return this.accessGroups.listGroups(clientId!);
  }

  @Post('access-groups')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateAccessGroupDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMetaDecorator() meta: RequestMeta,
  ) {
    return this.accessGroups.createGroup(clientId!, dto, { actorUserId, meta });
  }

  @Get('access-groups/:id')
  getOne(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.accessGroups.getGroupById(clientId!, id);
  }

  @Patch('access-groups/:id')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateAccessGroupDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMetaDecorator() meta: RequestMeta,
  ) {
    return this.accessGroups.updateGroup(clientId!, id, dto, {
      actorUserId,
      meta,
    });
  }

  @Delete('access-groups/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMetaDecorator() meta: RequestMeta,
  ): Promise<void> {
    await this.accessGroups.deleteGroup(clientId!, id, { actorUserId, meta });
  }

  @Get('access-groups/:id/members')
  listMembers(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.accessGroups.listMembers(clientId!, id);
  }

  @Post('access-groups/:id/members')
  addMember(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: AddAccessGroupMemberDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMetaDecorator() meta: RequestMeta,
  ) {
    return this.accessGroups.addMember(clientId!, id, dto.userId, {
      actorUserId,
      meta,
    });
  }

  @Delete('access-groups/:id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMetaDecorator() meta: RequestMeta,
  ): Promise<void> {
    await this.accessGroups.removeMember(clientId!, id, userId, {
      actorUserId,
      meta,
    });
  }
}

import {
  Controller,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { PatchHumanResourceLinkDto } from './dto/patch-human-resource-link.dto';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import {
  RequestMeta,
  RequestMeta as RequestMetaDecorator,
} from '../../common/decorators/request-meta.decorator';

/**
 * Endpoint plateforme — RFC-ACL-010 cockpit licences.
 *
 * Liste les membres d'un client (User + ClientUser, licence + dates) sans
 * dépendre du client actif. Protégé exclusivement par PlatformAdminGuard ;
 * aucune dérivation du `clientId` depuis le header X-Client-Id ou
 * l'ActiveClientGuard. Le `clientId` est validé en base avant d'invoquer
 * le service partagé `UsersService.findAll`.
 */
@Controller('platform/clients/:clientId/users')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class PlatformClientUsersController {
  constructor(
    private readonly users: UsersService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async listClientUsers(@Param('clientId') clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    });
    if (!client) {
      throw new NotFoundException('Client introuvable');
    }
    return this.users.findAll(clientId);
  }

  /**
   * RFC-ORG-002 — Lie ou délie une Resource HUMAN pour un ClientUser (PLATFORM_ADMIN, sans X-Client-Id).
   */
  @Patch(':userId')
  @HttpCode(HttpStatus.OK)
  async patchHumanResourceLink(
    @Param('clientId') clientId: string,
    @Param('userId') userId: string,
    @Body() dto: PatchHumanResourceLinkDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMetaDecorator() meta: RequestMeta,
  ) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    });
    if (!client) {
      throw new NotFoundException('Client introuvable');
    }
    await this.users.patchHumanResourceLinkForClientMember(
      clientId,
      userId,
      dto.humanResourceId,
      { actorUserId, meta },
    );
    return this.users.getClientMemberForClient(clientId, userId);
  }
}

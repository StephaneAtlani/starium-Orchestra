import {
  Controller,
  Get,
  NotFoundException,
  Param,
  UseGuards,
} from '@nestjs/common';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';

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
}

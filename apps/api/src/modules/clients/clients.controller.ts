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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { CreateClientDto } from './dto/create-client.dto';
import { AttachUserToClientDto } from './dto/attach-user-to-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientMembershipService } from './client-membership.service';
import { ClientsService } from './clients.service';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import {
  RequestMeta,
  RequestMeta as RequestMetaDecorator,
} from '../../common/decorators/request-meta.decorator';

/**
 * Gestion des clients (RFC-009).
 * Toutes les routes sont protégées par JwtAuthGuard et PlatformAdminGuard.
 */
@Controller('clients')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class ClientsController {
  constructor(
    private readonly clients: ClientsService,
    private readonly membership: ClientMembershipService,
  ) {}

  /** GET /clients — Tous les clients, sans pagination ni filtre, triés par createdAt desc. */
  @Get()
  findAll() {
    return this.clients.findAll();
  }

  /** POST /clients — Crée un client (réponse strictement { id, name, slug }). */
  @Post()
  async create(
    @Body() dto: CreateClientDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMetaDecorator() meta: RequestMeta,
  ) {
    return this.clients.create(dto, { actorUserId: actorUserId!, meta });
  }

  /** PATCH /clients/:id — Met à jour name et/ou slug (réponse strictement { id, name, slug }). */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMetaDecorator() meta: RequestMeta,
  ) {
    return this.clients.update(id, dto, { actorUserId: actorUserId!, meta });
  }

  /** DELETE /clients/:id — Suppression physique du client et des ClientUser liés. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.clients.remove(id);
  }

  /** POST /clients/:clientId/users — rattache un user à un client (Platform Admin). */
  @Post(':clientId/users')
  attachUser(
    @Param('clientId') clientId: string,
    @Body() dto: AttachUserToClientDto,
  ) {
    return this.membership.attachUserToClient(clientId, dto);
  }

  /** DELETE /clients/:clientId/users/:userId — supprime le lien ClientUser pour ce client. */
  @Delete(':clientId/users/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async detachUser(
    @Param('clientId') clientId: string,
    @Param('userId') userId: string,
  ): Promise<void> {
    await this.membership.detachUserFromClient(clientId, userId);
  }
}

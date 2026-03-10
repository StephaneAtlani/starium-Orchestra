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
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ClientAdminGuard } from '../../common/guards/client-admin.guard';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import {
  RequestMeta,
  RequestMeta as RequestMetaDecorator,
} from '../../common/decorators/request-meta.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

/**
 * Gestion des utilisateurs du client actif (RFC-008).
 * Toutes les routes exigent : JWT + X-Client-Id + rôle CLIENT_ADMIN.
 */
@Controller('users')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ClientAdminGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /** GET /users — Liste des utilisateurs du client actif (agrégat User + ClientUser). */
  @Get()
  findAll(@ActiveClientId() clientId?: string) {
    return this.users.findAll(clientId!);
  }

  /** POST /users — Crée un utilisateur ou rattache un existant au client ; 409 si déjà rattaché. */
  @Post()
  async create(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateUserDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMetaDecorator() meta: RequestMeta,
  ) {
    return this.users.create(clientId!, dto, { actorUserId: actorUserId!, meta });
  }

  /** PATCH /users/:id — Met à jour firstName, lastName (User) et role, status (ClientUser). */
  @Patch(':id')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') userId: string,
    @Body() dto: UpdateUserDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMetaDecorator() meta: RequestMeta,
  ) {
    return this.users.update(clientId!, userId, dto, {
      actorUserId: actorUserId!,
      meta,
    });
  }

  /** DELETE /users/:id — Supprime uniquement le lien ClientUser (pas le User global). */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') userId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMetaDecorator() meta: RequestMeta,
  ): Promise<void> {
    await this.users.remove(clientId!, userId, { actorUserId: actorUserId!, meta });
  }
}

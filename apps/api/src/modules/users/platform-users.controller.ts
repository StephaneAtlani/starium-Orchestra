import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { CreatePlatformUserDto } from './dto/create-platform-user.dto';
import { UpdatePlatformUserClientsDto } from './dto/update-platform-user-clients.dto';
import { UsersService } from './users.service';

/**
 * Endpoints plateforme pour la gestion des utilisateurs globaux (Platform Admin uniquement).
 */
@Controller('platform/users')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class PlatformUsersController {
  constructor(private readonly users: UsersService) {}

  /** GET /platform/users — Liste des utilisateurs globaux (scope plateforme). */
  @Get()
  findAll() {
    return this.users.listPlatformUsers();
  }

  /** POST /platform/users — Crée un utilisateur global (sans rattachement client). */
  @Post()
  create(@Body() dto: CreatePlatformUserDto) {
    return this.users.createPlatformUser(dto);
  }

  /**
   * GET /platform/users/:userId/clients — récupère les rattachements client d’un utilisateur global.
   */
  @Get(':userId/clients')
  getUserClients(@Param('userId') userId: string) {
    return this.users.getPlatformUserClients(userId);
  }

  /**
   * PUT /platform/users/:userId/clients — remplace les rattachements client d’un utilisateur global.
   * Idempotent : le backend applique exactement la liste fournie (ajouts, mises à jour de rôle, suppressions).
   */
  @Put(':userId/clients')
  updateUserClients(
    @Param('userId') userId: string,
    @Body() dto: UpdatePlatformUserClientsDto,
  ) {
    return this.users.updatePlatformUserClients(userId, dto);
  }
}


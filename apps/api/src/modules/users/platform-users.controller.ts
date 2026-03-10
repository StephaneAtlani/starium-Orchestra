import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { CreatePlatformUserDto } from './dto/create-platform-user.dto';
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
}


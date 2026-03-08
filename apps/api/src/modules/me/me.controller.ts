import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { MeService } from './me.service';

/**
 * Profil et contexte de l’utilisateur connecté (RFC-008).
 * Toutes les routes exigent un JWT valide.
 */
@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(private readonly me: MeService) {}

  /** GET /me — Profil global (id, email, firstName, lastName). */
  @Get()
  getProfile(@RequestUserId() userId?: string) {
    return this.me.getProfile(userId!);
  }

  /** GET /me/clients — Liste des clients auxquels l’utilisateur a accès. */
  @Get('clients')
  getClients(@RequestUserId() userId?: string) {
    return this.me.getClients(userId!);
  }
}

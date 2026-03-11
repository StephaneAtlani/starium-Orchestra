import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { SetDefaultClientDto } from './dto/set-default-client.dto';
import { MeService } from './me.service';

/**
 * Profil et contexte de l’utilisateur connecté (RFC-008, RFC-009-1).
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

  /** PATCH /me/default-client — Définit le client par défaut (RFC-009-1). */
  @Patch('default-client')
  setDefaultClient(
    @RequestUserId() userId: string | undefined,
    @Body() dto: SetDefaultClientDto,
  ) {
    return this.me.setDefaultClient(userId!, dto.clientId);
  }
}

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
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientsService } from './clients.service';

/**
 * Gestion des clients (RFC-009).
 * Toutes les routes sont protégées par JwtAuthGuard et PlatformAdminGuard.
 */
@Controller('clients')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  /** GET /clients — Tous les clients, sans pagination ni filtre, triés par createdAt desc. */
  @Get()
  findAll() {
    return this.clients.findAll();
  }

  /** POST /clients — Crée un client et rattache l'admin désigné (réponse strictement { id, name, slug }). */
  @Post()
  async create(@Body() dto: CreateClientDto) {
    return this.clients.create(dto);
  }

  /** PATCH /clients/:id — Met à jour name et/ou slug (réponse strictement { id, name, slug }). */
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateClientDto) {
    return this.clients.update(id, dto);
  }

  /** DELETE /clients/:id — Suppression physique du client et des ClientUser liés. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.clients.remove(id);
  }
}

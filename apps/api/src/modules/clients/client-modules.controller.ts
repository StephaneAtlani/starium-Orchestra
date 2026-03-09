import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import {
  ClientModuleItem,
  ClientModulesService,
  ModuleCatalogueItem,
} from './client-modules.service';
import { SetClientModuleDto } from './dto/set-client-module.dto';
import { UpdateClientModuleStatusDto } from './dto/update-client-module-status.dto';

/**
 * Gestion des modules au niveau plateforme (RFC-011, lot 1).
 * Routes réservées aux administrateurs plateforme (PlatformAdminGuard).
 */
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@Controller()
export class ClientModulesController {
  constructor(private readonly clientModules: ClientModulesService) {}

  /** GET /modules — Liste du catalogue global des modules. */
  @Get('modules')
  getCatalogue(): Promise<ModuleCatalogueItem[]> {
    return this.clientModules.listCatalogue();
  }

  /** GET /clients/:clientId/modules — Liste des modules + statut pour un client. */
  @Get('clients/:clientId/modules')
  getClientModules(
    @Param('clientId') clientId: string,
  ): Promise<ClientModuleItem[]> {
    return this.clientModules.listForClient(clientId);
  }

  /** POST /clients/:clientId/modules — Active un module pour un client (idempotent). */
  @Post('clients/:clientId/modules')
  activateModule(
    @Param('clientId') clientId: string,
    @Body() dto: SetClientModuleDto,
  ): Promise<ClientModuleItem> {
    return this.clientModules.activateModuleForClient({
      clientId,
      moduleCode: dto.moduleCode,
    });
  }

  /** PATCH /clients/:clientId/modules/:moduleCode — Change le statut ENABLED/DISABLED. */
  @Patch('clients/:clientId/modules/:moduleCode')
  updateModuleStatus(
    @Param('clientId') clientId: string,
    @Param('moduleCode') moduleCode: string,
    @Body() dto: UpdateClientModuleStatusDto,
  ): Promise<ClientModuleItem> {
    return this.clientModules.updateClientModuleStatus({
      clientId,
      moduleCode,
      status: dto.status,
    });
  }
}


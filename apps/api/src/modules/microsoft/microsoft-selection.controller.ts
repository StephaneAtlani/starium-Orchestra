import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { MicrosoftIntegrationAccessGuard } from '../../common/guards/microsoft-integration-access.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { MicrosoftSelectionService } from './microsoft-selection.service';

@Controller('microsoft')
@UseGuards(JwtAuthGuard, ActiveClientGuard, MicrosoftIntegrationAccessGuard)
export class MicrosoftSelectionController {
  constructor(
    private readonly selection: MicrosoftSelectionService,
  ) {}

  @Get('teams')
  @RequirePermissions('projects.update')
  listTeams(@ActiveClientId() clientId: string | undefined) {
    return this.selection.listTeams(clientId!);
  }

  @Get('teams/:teamId/channels')
  @RequirePermissions('projects.update')
  listChannels(
    @ActiveClientId() clientId: string | undefined,
    @Param('teamId') teamId: string,
  ) {
    return this.selection.listChannels(clientId!, teamId);
  }

  /**
   * Route plans provisoire : le contrat public reste neutre vis-à-vis du `channelId`
   * tant que le spike Graph n'a pas validé un filtrage spécifique.
   */
  @Get('teams/:teamId/plans')
  @RequirePermissions('projects.update')
  listPlansForTeam(
    @ActiveClientId() clientId: string | undefined,
    @Param('teamId') teamId: string,
  ) {
    return this.selection.listPlansForTeam(clientId!, teamId);
  }
}


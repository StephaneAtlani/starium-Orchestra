import {
  BadGatewayException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  MicrosoftGraphHttpError,
  type MicrosoftGraphODataListResponse,
} from './microsoft-graph.types';
import { MicrosoftGraphService } from './microsoft-graph.service';
import { MicrosoftOAuthService } from './microsoft-oauth.service';

type GraphTeam = { id: string; displayName: string };
type GraphChannel = { id: string; displayName: string };
type GraphPlannerPlan = { id: string; title: string };

export interface MicrosoftTeamOption {
  teamId: string;
  teamName: string;
}

export interface MicrosoftChannelOption {
  channelId: string;
  channelName: string;
}

export interface MicrosoftPlannerPlanOption {
  plannerPlanId: string;
  plannerPlanTitle: string;
}

@Injectable()
export class MicrosoftSelectionService {
  constructor(
    private readonly oauth: MicrosoftOAuthService,
    private readonly graph: MicrosoftGraphService,
  ) {}

  async listTeams(clientId: string): Promise<{ items: MicrosoftTeamOption[] }> {
    const connection = await this.assertActiveConnection(clientId);
    const data = await this.withGraphErrorMapping(async () => {
      return this.graph.requestForConnection<
        MicrosoftGraphODataListResponse<GraphTeam>
      >(clientId, connection.id, 'me/joinedTeams?$select=id,displayName', {
        expectJson: true,
      });
    });

    const value = data?.value ?? [];
    return {
      items: value.map((t) => ({
        teamId: t.id,
        teamName: t.displayName,
      })),
    };
  }

  async listChannels(
    clientId: string,
    teamId: string,
  ): Promise<{ items: MicrosoftChannelOption[] }> {
    const connection = await this.assertActiveConnection(clientId);
    const data = await this.withGraphErrorMapping(async () => {
      return this.graph.requestForConnection<
        MicrosoftGraphODataListResponse<GraphChannel>
      >(clientId, connection.id, `teams/${teamId}/channels?$select=id,displayName`, {
        expectJson: true,
      });
    });

    const value = data?.value ?? [];
    return {
      items: value.map((c) => ({
        channelId: c.id,
        channelName: c.displayName,
      })),
    };
  }

  /**
   * Plans Planner — route publique provisoire.
   * Le contrat public reste neutre : la route de lecture dépend du `teamId`
   * et ne promet pas un filtrage “plan par canal” tant que Graph n’est pas spike/validé.
   */
  async listPlansForTeam(
    clientId: string,
    teamId: string,
  ): Promise<{ items: MicrosoftPlannerPlanOption[] }> {
    const connection = await this.assertActiveConnection(clientId);
    const data = await this.withGraphErrorMapping(async () => {
      return this.graph.requestForConnection<
        MicrosoftGraphODataListResponse<GraphPlannerPlan>
      >(clientId, connection.id, `groups/${teamId}/planner/plans?$select=id,title`, {
        expectJson: true,
      });
    });

    const value = data?.value ?? [];
    return {
      items: value.map((p) => ({
        plannerPlanId: p.id,
        plannerPlanTitle: p.title,
      })),
    };
  }

  private async assertActiveConnection(clientId: string) {
    const connection = await this.oauth.getActiveConnection(clientId);
    if (!connection) {
      throw new NotFoundException('Connexion Microsoft introuvable');
    }
    return connection;
  }

  private mapGraphError(e: unknown): never {
    if (e instanceof MicrosoftGraphHttpError) {
      if (e.statusCode === 401) {
        throw new UnauthorizedException(
          e.graphMessage ?? 'Accès Microsoft Graph non autorisé',
        );
      }
      if (e.statusCode === 403) {
        throw new ForbiddenException(
          e.graphMessage ?? 'Accès Microsoft Graph refusé',
        );
      }
      throw new BadGatewayException(
        e.graphMessage ?? 'Erreur Microsoft Graph',
      );
    }
    throw e;
  }

  async withGraphErrorMapping<T>(
    fn: () => Promise<T | void>,
  ): Promise<T | undefined> {
    try {
      return (await fn()) as T | undefined;
    } catch (e) {
      return this.mapGraphError(e);
    }
  }
}


import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MicrosoftGraphHttpError } from './microsoft-graph.types';
import { MicrosoftGraphService } from './microsoft-graph.service';
import { MicrosoftOAuthService } from './microsoft-oauth.service';
import {
  MicrosoftSelectionService,
  type MicrosoftTeamOption,
} from './microsoft-selection.service';

describe('MicrosoftSelectionService — RFC-PROJ-INT-006', () => {
  const clientId = 'client-x';
  const connectionId = 'conn-x';

  const oauth = {
    getActiveConnection: jest.fn(),
  };

  const graph = {
    requestForConnection: jest.fn(),
  };

  const service = new MicrosoftSelectionService(
    oauth as unknown as MicrosoftOAuthService,
    graph as unknown as MicrosoftGraphService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('listTeams : renvoie liste vide si Graph renvoie value vide', async () => {
    oauth.getActiveConnection.mockResolvedValue({
      id: connectionId,
    });
    graph.requestForConnection.mockResolvedValue({
      value: [],
    });

    const res = await service.listTeams(clientId);

    expect(oauth.getActiveConnection).toHaveBeenCalledWith(clientId);
    expect(graph.requestForConnection).toHaveBeenCalledWith(
      clientId,
      connectionId,
      'me/joinedTeams?$select=id,displayName',
      { expectJson: true },
    );
    expect(res).toEqual({ items: [] as MicrosoftTeamOption[] });
  });

  it('listTeams : 403 Graph => ForbiddenException', async () => {
    oauth.getActiveConnection.mockResolvedValue({ id: connectionId });
    graph.requestForConnection.mockRejectedValue(
      new MicrosoftGraphHttpError(
        'Accès refusé',
        403,
        'Authorization_RequestDenied',
        'Forbidden',
      ),
    );

    await expect(service.listTeams(clientId)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('listTeams : isolation client (clientId passé à oauth puis graph)', async () => {
    oauth.getActiveConnection.mockResolvedValue({ id: connectionId });
    graph.requestForConnection.mockResolvedValue({
      value: [{ id: 't1', displayName: 'Team A' }],
    });

    await service.listTeams(clientId);

    expect(oauth.getActiveConnection).toHaveBeenCalledWith(clientId);
    expect(graph.requestForConnection).toHaveBeenCalledWith(
      clientId,
      connectionId,
      'me/joinedTeams?$select=id,displayName',
      { expectJson: true },
    );
  });

  it('listTeams : pas de connexion active => NotFoundException', async () => {
    oauth.getActiveConnection.mockResolvedValue(null);

    await expect(service.listTeams(clientId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});


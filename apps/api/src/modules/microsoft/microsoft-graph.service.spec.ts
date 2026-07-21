import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MicrosoftGraphService } from './microsoft-graph.service';
import { MicrosoftOAuthService } from './microsoft-oauth.service';
import { MicrosoftGraphHttpError } from './microsoft-graph.types';
import { MICROSOFT_GRAPH_BASE_URL } from './microsoft.constants';

function jsonResponse(
  status: number,
  body: string,
  extraHeaders?: Record<string, string>,
): Response {
  const h = new Headers({ 'content-type': 'application/json', ...extraHeaders });
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: h,
    text: async () => body,
  } as Response;
}

describe('MicrosoftGraphService', () => {
  const origFetch = global.fetch;

  afterEach(() => {
    global.fetch = origFetch;
    jest.restoreAllMocks();
  });

  async function createService(oauth?: Partial<MicrosoftOAuthService>) {
    const moduleRef = await Test.createTestingModule({
      providers: [
        MicrosoftGraphService,
        {
          provide: ConfigService,
          useValue: {
            get: (k: string) => {
              if (k === 'MICROSOFT_GRAPH_HTTP_TIMEOUT_MS') return '5000';
              return undefined;
            },
          },
        },
        {
          provide: MicrosoftOAuthService,
          useValue: {
            ensureFreshAccessToken: jest
              .fn()
              .mockResolvedValue('fresh-token'),
            ...oauth,
          },
        },
      ],
    }).compile();
    return moduleRef.get(MicrosoftGraphService);
  }

  it('succès 200 JSON', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse(200, JSON.stringify({ displayName: 'X' })),
    );
    const svc = await createService();
    const data = await svc.getJson<{ displayName: string }>('tok', 'me');
    expect(data).toEqual({ displayName: 'X' });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('succès 204 sans JSON', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 204,
      headers: new Headers(),
      text: async () => '',
    } as Response);
    const svc = await createService();
    const data = await svc.getJson('tok', 'me');
    expect(data).toBeUndefined();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('401 sans retry', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse(
        401,
        JSON.stringify({
          error: { code: 'InvalidAuthenticationToken', message: 'bad' },
        }),
      ),
    );
    const svc = await createService();
    await expect(svc.getJson('tok', 'me')).rejects.toMatchObject({
      statusCode: 401,
      graphCode: 'InvalidAuthenticationToken',
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('429 avec Retry-After puis 200', async () => {
    const h429 = new Headers({
      'content-type': 'application/json',
      'Retry-After': '0',
    });
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: h429,
        text: async () =>
          JSON.stringify({
            error: { code: 'TooManyRequests', message: 'slow' },
          }),
      } as Response)
      .mockResolvedValueOnce(jsonResponse(200, JSON.stringify({ ok: true })));

    const svc = await createService();
    const data = await svc.getJson<{ ok: boolean }>('tok', 'me');
    expect(data).toEqual({ ok: true });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('429 puis échec après max tentatives', async () => {
    const h429 = new Headers({
      'content-type': 'application/json',
      'Retry-After': '0',
    });
    const body = JSON.stringify({
      error: { code: 'TooManyRequests', message: 'slow' },
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: h429,
      text: async () => body,
    } as Response);

    const svc = await createService();
    await expect(svc.getJson('tok', 'me')).rejects.toBeInstanceOf(
      MicrosoftGraphHttpError,
    );
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('5xx puis 200 sur GET (retry)', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          503,
          JSON.stringify({ error: { code: 'ServiceUnavailable', message: 'x' } }),
        ),
      )
      .mockResolvedValueOnce(jsonResponse(200, JSON.stringify({ r: 1 })));

    const svc = await createService();
    const data = await svc.getJson<{ r: number }>('tok', 'me');
    expect(data).toEqual({ r: 1 });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('propage la cause réseau dans MicrosoftGraphHttpError', async () => {
    const cause = Object.assign(
      new Error('getaddrinfo ENOTFOUND graph.microsoft.com'),
      { code: 'ENOTFOUND' },
    );
    const networkErr = new TypeError('fetch failed', { cause });
    global.fetch = jest.fn().mockRejectedValue(networkErr);

    const svc = await createService();
    await expect(svc.getJson('tok', 'me')).rejects.toMatchObject({
      statusCode: 0,
      message: expect.stringContaining('ENOTFOUND'),
      graphMessage: expect.stringContaining('ENOTFOUND'),
    });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('erreur réseau puis succès au retry', async () => {
    let n = 0;
    global.fetch = jest.fn().mockImplementation(() => {
      n++;
      if (n === 1) {
        return Promise.reject(new TypeError('fetch failed'));
      }
      return Promise.resolve(jsonResponse(200, JSON.stringify({ ok: 1 })));
    });

    const svc = await createService();
    const data = await svc.getJson<{ ok: number }>('tok', 'me');
    expect(data).toEqual({ ok: 1 });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('erreur non JSON sur statut non OK', async () => {
    const h = new Headers({ 'content-type': 'text/plain' });
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: h,
      text: async () => 'plain error',
    } as Response);

    const svc = await createService();
    await expect(svc.getJson('tok', 'me')).rejects.toMatchObject({
      statusCode: 500,
    });
  });

  it('path normalization : me, /me, //me → même URL', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(jsonResponse(200, JSON.stringify({})));

    const svc = await createService();
    await svc.getJson('tok', 'me');
    await svc.getJson('tok', '/me');
    await svc.getJson('tok', '//me');

    const urls = (global.fetch as jest.Mock).mock.calls.map(
      (c: [string]) => c[0],
    );
    expect(urls[0]).toBe(`${MICROSOFT_GRAPH_BASE_URL}/me`);
    expect(urls[1]).toBe(`${MICROSOFT_GRAPH_BASE_URL}/me`);
    expect(urls[2]).toBe(`${MICROSOFT_GRAPH_BASE_URL}/me`);
  });

  it('planner task helper : renvoie JSON + ETag', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse(
        200,
        JSON.stringify({ id: 'task-1', title: 'T' }),
        { etag: 'W/"task-etag"' },
      ),
    );
    const svc = await createService();
    const res = await svc.getPlannerTaskWithEtag('tok', 'task-1');

    expect(res.json).toEqual({ id: 'task-1', title: 'T' });
    expect(res.etag).toBe('W/"task-etag"');

    const url = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(url).toBe(`${MICROSOFT_GRAPH_BASE_URL}/planner/tasks/task-1`);
  });

  it('planner task details helper : renvoie JSON + ETag', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse(
        200,
        JSON.stringify({ id: 'task-1', description: 'D' }),
        { etag: 'W/"details-etag"' },
      ),
    );
    const svc = await createService();
    const res = await svc.getPlannerTaskDetailsWithEtag('tok', 'task-1');

    expect(res.json).toEqual({ id: 'task-1', description: 'D' });
    expect(res.etag).toBe('W/"details-etag"');

    const url = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(url).toBe(
      `${MICROSOFT_GRAPH_BASE_URL}/planner/tasks/task-1/details`,
    );
  });

  it('requestForConnection appelle ensureFreshAccessToken(connectionId, clientId)', async () => {
    const ensureFresh = jest.fn().mockResolvedValue('ftok');
    global.fetch = jest
      .fn()
      .mockResolvedValue(jsonResponse(200, JSON.stringify({ a: 1 })));

    const moduleRef = await Test.createTestingModule({
      providers: [
        MicrosoftGraphService,
        {
          provide: ConfigService,
          useValue: { get: () => undefined },
        },
        {
          provide: MicrosoftOAuthService,
          useValue: { ensureFreshAccessToken: ensureFresh },
        },
      ],
    }).compile();
    const svc = moduleRef.get(MicrosoftGraphService);

    await svc.requestForConnection<{ a: number }>('client-z', 'conn-y', 'me');

    expect(ensureFresh).toHaveBeenCalledWith('conn-y', 'client-z');
    expect(global.fetch).toHaveBeenCalled();
    const auth = (global.fetch as jest.Mock).mock.calls[0][1].headers.get(
      'Authorization',
    );
    expect(auth).toBe('Bearer ftok');
  });

  it('POST sans retry sur 5xx', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse(
        503,
        JSON.stringify({ error: { code: 'x', message: 'y' } }),
      ),
    );
    const svc = await createService();
    await expect(
      svc.postJson('tok', 'me', { foo: 1 }),
    ).rejects.toBeInstanceOf(MicrosoftGraphHttpError);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('createTeam envoie template@odata.bind + visibility Private', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 202,
      headers: new Headers({
        Location: 'https://graph.microsoft.com/v1.0/teams(...)/operations/op-1',
        'Content-Location': 'https://graph.microsoft.com/v1.0/teams/team-1',
      }),
      text: async () => '',
    } as Response);
    const svc = await createService();
    const result = await svc.createTeam(
      { clientId: 'c1', id: 'conn-1' },
      {
        displayName: 'IND-SEED-04 - Projet',
        description: 'Desc',
        visibility: 'private',
      },
    );
    expect(result.location).toContain('operations/op-1');
    expect(result.contentLocation).toContain('teams/team-1');
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body['template@odata.bind']).toBe(
      "https://graph.microsoft.com/v1.0/teamsTemplates('standard')",
    );
    expect(body.displayName).toBe('IND-SEED-04 - Projet');
    expect(body.description).toBe('Desc');
    expect(body.visibility).toBe('Private');
  });

  it('createTeam mappe abort timeout en message explicite', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(
        new DOMException('This operation was aborted', 'AbortError'),
      );
    const svc = await createService();
    await expect(
      svc.createTeam(
        { clientId: 'c1', id: 'conn-1' },
        { displayName: 'T', visibility: 'private' },
      ),
    ).rejects.toMatchObject({
      message: expect.stringMatching(/Timeout Graph après 60000ms/),
    });
  });

  it('pollAsyncOperation appelle onHeartbeat entre itérations', async () => {
    jest.useFakeTimers();
    let call = 0;
    global.fetch = jest.fn().mockImplementation(async () => {
      call += 1;
      if (call === 1) {
        return jsonResponse(
          200,
          JSON.stringify({ status: 'running' }),
          { 'Retry-After': '30' },
        );
      }
      return jsonResponse(200, JSON.stringify({ status: 'succeeded' }));
    });
    const svc = await createService();
    const onHeartbeat = jest.fn();
    const promise = svc.pollAsyncOperation(
      { clientId: 'c1', id: 'conn-1' },
      '/teams/op-1',
      { onHeartbeat },
    );
    await jest.advanceTimersByTimeAsync(30_000);
    await promise;
    expect(onHeartbeat).toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('getPrimaryTeamChannel retourne id + displayName', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse(
        200,
        JSON.stringify({ id: 'ch-1', displayName: 'Général' }),
      ),
    );
    const svc = await createService();
    const channel = await svc.getPrimaryTeamChannel(
      { clientId: 'c1', id: 'conn-1' },
      'team-1',
    );
    expect(channel).toEqual({ id: 'ch-1', displayName: 'Général' });
  });
});

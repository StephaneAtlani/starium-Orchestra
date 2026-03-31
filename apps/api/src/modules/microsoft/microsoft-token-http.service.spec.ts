import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MicrosoftTokenHttpService } from './microsoft-token-http.service';

describe('MicrosoftTokenHttpService', () => {
  const origFetch = global.fetch;

  afterEach(() => {
    global.fetch = origFetch;
  });

  it('posts form and parses success JSON', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          access_token: 'at',
          refresh_token: 'rt',
          expires_in: 3600,
          id_token: 'idt',
        }),
    });

    const moduleRef = await Test.createTestingModule({
      providers: [
        MicrosoftTokenHttpService,
        {
          provide: ConfigService,
          useValue: {
            get: (k: string) => {
              if (k === 'MICROSOFT_TOKEN_HTTP_TIMEOUT_MS') return '5000';
              if (k === 'MICROSOFT_TENANT') return 'common';
              return undefined;
            },
          },
        },
      ],
    }).compile();

    const http = moduleRef.get(MicrosoftTokenHttpService);
    const body = new URLSearchParams({ grant_type: 'refresh_token' });
    const res = await http.postTokenForm(body);
    expect(res.access_token).toBe('at');
    expect(res.refresh_token).toBe('rt');
    expect(res.id_token).toBe('idt');
  });

  it('throws with oauthError on 400', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () =>
        JSON.stringify({
          error: 'invalid_grant',
          error_description: 'bad',
        }),
    });

    const moduleRef = await Test.createTestingModule({
      providers: [
        MicrosoftTokenHttpService,
        {
          provide: ConfigService,
          useValue: {
            get: () => undefined,
          },
        },
      ],
    }).compile();

    const http = moduleRef.get(MicrosoftTokenHttpService);
    await expect(
      http.postTokenForm(new URLSearchParams()),
    ).rejects.toMatchObject({ oauthError: 'invalid_grant' });
  });
});

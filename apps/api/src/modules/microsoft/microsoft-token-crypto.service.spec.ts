import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MicrosoftTokenCryptoService } from './microsoft-token-crypto.service';

describe('MicrosoftTokenCryptoService', () => {
  it('roundtrips encrypt/decrypt with MICROSOFT_TOKEN_ENCRYPTION_KEY hex', async () => {
    const hexKey = 'b'.repeat(64);
    const moduleRef = await Test.createTestingModule({
      providers: [
        MicrosoftTokenCryptoService,
        {
          provide: ConfigService,
          useValue: {
            get: (k: string) =>
              k === 'MICROSOFT_TOKEN_ENCRYPTION_KEY' ? hexKey : undefined,
          },
        },
      ],
    }).compile();

    const crypto = moduleRef.get(MicrosoftTokenCryptoService);
    const plain = 'secret-access-token';
    const enc = crypto.encrypt(plain);
    expect(enc).not.toContain(plain);
    expect(crypto.decrypt(enc)).toBe(plain);
  });
});

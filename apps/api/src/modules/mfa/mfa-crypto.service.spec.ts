import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MfaCryptoService } from './mfa-crypto.service';

describe('MfaCryptoService', () => {
  it('roundtrips encrypt/decrypt with MFA_ENCRYPTION_KEY hex', async () => {
    const hexKey = 'a'.repeat(64);
    const moduleRef = await Test.createTestingModule({
      providers: [
        MfaCryptoService,
        {
          provide: ConfigService,
          useValue: {
            get: (k: string) =>
              k === 'MFA_ENCRYPTION_KEY' ? hexKey : undefined,
          },
        },
      ],
    }).compile();

    const crypto = moduleRef.get(MfaCryptoService);
    const plain = 'JBSWY3DPEHPK3PXP';
    const enc = crypto.encrypt(plain);
    expect(enc).not.toContain(plain);
    expect(crypto.decrypt(enc)).toBe(plain);
  });
});

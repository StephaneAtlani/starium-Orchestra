import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MfaCryptoService } from './mfa-crypto.service';

function buildConfigValue(overrides: Record<string, string> = {}) {
  return {
    get: (k: string) => overrides[k] ?? undefined,
  };
}

const HEX_KEY_V1 = 'a'.repeat(64);
const HEX_KEY_V2 = 'b'.repeat(64);

describe('MfaCryptoService', () => {
  it('roundtrips encrypt/decrypt with MFA_ENCRYPTION_KEY hex', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        MfaCryptoService,
        {
          provide: ConfigService,
          useValue: buildConfigValue({ MFA_ENCRYPTION_KEY: HEX_KEY_V1 }),
        },
      ],
    }).compile();

    const crypto = moduleRef.get(MfaCryptoService);
    const plain = 'JBSWY3DPEHPK3PXP';
    const enc = crypto.encrypt(plain);
    expect(enc).not.toContain(plain);
    expect(enc).toMatch(/^v1:/);
    expect(crypto.decrypt(enc)).toBe(plain);
  });

  it('fail-fast en production sans MFA_ENCRYPTION_KEY', async () => {
    await expect(
      Test.createTestingModule({
        providers: [
          MfaCryptoService,
          {
            provide: ConfigService,
            useValue: buildConfigValue({ NODE_ENV: 'production' }),
          },
        ],
      }).compile(),
    ).rejects.toThrow('MFA_ENCRYPTION_KEY is required in production');
  });

  it('rétro-compatibilité : décrypt payload ancien format (iv:tag:data sans prefix)', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        MfaCryptoService,
        {
          provide: ConfigService,
          useValue: buildConfigValue({ MFA_ENCRYPTION_KEY: HEX_KEY_V1 }),
        },
      ],
    }).compile();

    const crypto = moduleRef.get(MfaCryptoService);
    const plain = 'RETRO_COMPAT_SECRET';
    const enc = crypto.encrypt(plain);

    const legacy = enc.replace(/^v\d+:/, '');
    expect(crypto.decrypt(legacy)).toBe(plain);
  });

  it('multi-clés : encrypt V2, decrypt avec service connaissant V1+V2', async () => {
    const encModuleRef = await Test.createTestingModule({
      providers: [
        MfaCryptoService,
        {
          provide: ConfigService,
          useValue: buildConfigValue({
            MFA_ENCRYPTION_KEY: HEX_KEY_V2,
            MFA_KEY_VERSION: '2',
          }),
        },
      ],
    }).compile();
    const encCrypto = encModuleRef.get(MfaCryptoService);
    const encrypted = encCrypto.encrypt('SECRET_V2');
    expect(encrypted).toMatch(/^v2:/);

    const decModuleRef = await Test.createTestingModule({
      providers: [
        MfaCryptoService,
        {
          provide: ConfigService,
          useValue: buildConfigValue({
            MFA_ENCRYPTION_KEY: HEX_KEY_V2,
            MFA_KEY_VERSION: '2',
            MFA_ENCRYPTION_KEY_V1: HEX_KEY_V1,
          }),
        },
      ],
    }).compile();
    const decCrypto = decModuleRef.get(MfaCryptoService);
    expect(decCrypto.decrypt(encrypted)).toBe('SECRET_V2');
  });

  it('getCurrentKeyVersion retourne la version courante', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        MfaCryptoService,
        {
          provide: ConfigService,
          useValue: buildConfigValue({
            MFA_ENCRYPTION_KEY: HEX_KEY_V1,
            MFA_KEY_VERSION: '3',
          }),
        },
      ],
    }).compile();

    expect(moduleRef.get(MfaCryptoService).getCurrentKeyVersion()).toBe(3);
  });

  it('décrypte un payload legacy chiffré avec JWT secret après introduction de MFA_ENCRYPTION_KEY', async () => {
    const plain = 'JWT_LEGACY_SECRET';

    const legacyModuleRef = await Test.createTestingModule({
      providers: [
        MfaCryptoService,
        {
          provide: ConfigService,
          useValue: buildConfigValue({
            JWT_SECRET: 'legacy-jwt-secret',
          }),
        },
      ],
    }).compile();
    const legacyCrypto = legacyModuleRef.get(MfaCryptoService);
    const encryptedWithJwtDerivedKey = legacyCrypto.encrypt(plain);

    const migratedModuleRef = await Test.createTestingModule({
      providers: [
        MfaCryptoService,
        {
          provide: ConfigService,
          useValue: buildConfigValue({
            JWT_SECRET: 'legacy-jwt-secret',
            MFA_ENCRYPTION_KEY: HEX_KEY_V1,
          }),
        },
      ],
    }).compile();
    const migratedCrypto = migratedModuleRef.get(MfaCryptoService);
    expect(migratedCrypto.decrypt(encryptedWithJwtDerivedKey)).toBe(plain);
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../prisma/prisma.service';
import { MicrosoftTokenCryptoService } from '../../microsoft/microsoft-token-crypto.service';
import { ProcurementS3ConfigResolverService } from './procurement-s3-config.resolver.service';
import { PlatformProcurementS3SettingsService } from './platform-procurement-s3-settings.service';

describe('PlatformProcurementS3SettingsService', () => {
  let service: PlatformProcurementS3SettingsService;
  let prisma: {
    platformProcurementS3Settings: {
      findUnique: jest.Mock;
      create: jest.Mock;
      upsert: jest.Mock;
    };
  };
  let resolver: { resolve: jest.Mock };

  const baseRow = {
    id: 'default',
    enabled: true,
    endpoint: 'http://minio:9000',
    region: 'us-east-1',
    accessKey: 'access-key',
    secretKeyEncrypted: 'cipher:blob',
    bucket: 'starium-procurement',
    useSsl: false,
    forcePathStyle: true,
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    prisma = {
      platformProcurementS3Settings: {
        findUnique: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
      },
    };
    resolver = { resolve: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformProcurementS3SettingsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: MicrosoftTokenCryptoService,
          useValue: { encrypt: jest.fn(), decrypt: jest.fn() },
        },
        { provide: ProcurementS3ConfigResolverService, useValue: resolver },
      ],
    }).compile();

    service = module.get(PlatformProcurementS3SettingsService);
  });

  describe('get', () => {
    it('exposes hasSecret but never secret fields', async () => {
      prisma.platformProcurementS3Settings.findUnique.mockResolvedValue(baseRow);
      resolver.resolve.mockResolvedValue({
        source: 'db',
        endpoint: baseRow.endpoint,
        bucket: baseRow.bucket,
      });

      const result = await service.get();

      expect(result.hasSecret).toBe(true);
      expect(result).not.toHaveProperty('secretKeyEncrypted');
      expect(result).not.toHaveProperty('secretKey');
      expect(result.effectiveSource).toBe('db');
    });

    it('hasSecret false when no encrypted secret stored', async () => {
      prisma.platformProcurementS3Settings.findUnique.mockResolvedValue({
        ...baseRow,
        secretKeyEncrypted: null,
      });
      resolver.resolve.mockResolvedValue(null);

      const result = await service.get();

      expect(result.hasSecret).toBe(false);
    });
  });
});

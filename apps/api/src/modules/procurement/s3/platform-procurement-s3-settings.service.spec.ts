import { ProcurementStorageDriver } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../prisma/prisma.service';
import { MicrosoftTokenCryptoService } from '../../microsoft/microsoft-token-crypto.service';
import { PlatformProcurementS3SettingsService } from './platform-procurement-s3-settings.service';
import { ProcurementStorageResolutionService } from './procurement-storage-resolution.service';

describe('PlatformProcurementS3SettingsService', () => {
  let service: PlatformProcurementS3SettingsService;
  let prisma: {
    platformProcurementS3Settings: {
      findUnique: jest.Mock;
      create: jest.Mock;
      upsert: jest.Mock;
    };
  };
  let storageResolution: { getEffectiveMetadataForRow: jest.Mock };

  const baseRow = {
    id: 'default',
    enabled: true,
    storageDriver: ProcurementStorageDriver.S3,
    localRoot: null,
    endpoint: 'http://minio:9000',
    region: 'us-east-1',
    accessKey: 'access-key',
    secretKeyEncrypted: 'cipher:blob',
    bucket: 'starium-procurement',
    useSsl: false,
    forcePathStyle: true,
    clientDocumentsBucketPrefix: null,
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
    storageResolution = {
      getEffectiveMetadataForRow: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformProcurementS3SettingsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: MicrosoftTokenCryptoService,
          useValue: { encrypt: jest.fn(), decrypt: jest.fn() },
        },
        {
          provide: ProcurementStorageResolutionService,
          useValue: storageResolution,
        },
      ],
    }).compile();

    service = module.get(PlatformProcurementS3SettingsService);
  });

  describe('get', () => {
    it('exposes hasSecret but never secret fields', async () => {
      prisma.platformProcurementS3Settings.findUnique.mockResolvedValue(baseRow);
      storageResolution.getEffectiveMetadataForRow.mockResolvedValue({
        effectiveDriver: 's3',
        effectiveLocalRootSource: 'none',
        effectiveSource: 'db',
      });

      const result = await service.get();

      expect(result.hasSecret).toBe(true);
      expect(result).not.toHaveProperty('secretKeyEncrypted');
      expect(result).not.toHaveProperty('secretKey');
      expect(result.effectiveSource).toBe('db');
      expect(result.effectiveDriver).toBe('s3');
      expect(result.storageDriver).toBe(ProcurementStorageDriver.S3);
    });

    it('hasSecret false when no encrypted secret stored', async () => {
      prisma.platformProcurementS3Settings.findUnique.mockResolvedValue({
        ...baseRow,
        secretKeyEncrypted: null,
      });
      storageResolution.getEffectiveMetadataForRow.mockResolvedValue({
        effectiveDriver: 's3',
        effectiveLocalRootSource: 'none',
        effectiveSource: 'none',
      });

      const result = await service.get();

      expect(result.hasSecret).toBe(false);
    });
  });
});

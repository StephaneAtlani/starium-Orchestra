import { ProcurementStorageDriver } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProcurementS3ConfigResolverService } from './procurement-s3-config.resolver.service';
import { ProcurementStorageResolutionService } from './procurement-storage-resolution.service';

describe('ProcurementStorageResolutionService', () => {
  let service: ProcurementStorageResolutionService;
  let config: { get: jest.Mock };
  let prisma: { platformProcurementS3Settings: { findUnique: jest.Mock } };
  let s3Resolver: { resolve: jest.Mock };

  beforeEach(async () => {
    config = { get: jest.fn() };
    prisma = {
      platformProcurementS3Settings: { findUnique: jest.fn() },
    };
    s3Resolver = { resolve: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcurementStorageResolutionService,
        { provide: ConfigService, useValue: config },
        { provide: PrismaService, useValue: prisma },
        { provide: ProcurementS3ConfigResolverService, useValue: s3Resolver },
      ],
    }).compile();

    service = module.get(ProcurementStorageResolutionService);
  });

  it('env PROCUREMENT_STORAGE_DRIVER=local overrides DB S3', async () => {
    prisma.platformProcurementS3Settings.findUnique.mockResolvedValue({
      storageDriver: ProcurementStorageDriver.S3,
      enabled: true,
      localRoot: '/data/db-root',
    });
    config.get.mockImplementation((k: string) => {
      if (k === 'PROCUREMENT_STORAGE_DRIVER') return 'local';
      if (k === 'PROCUREMENT_LOCAL_ROOT') return '/env-root';
      return undefined;
    });

    const ctx = await service.resolveForOperations();

    expect(ctx).toEqual({ driver: 'LOCAL', root: '/env-root' });
  });

  it('resolveForOperations uses S3 when driver S3 and config present', async () => {
    config.get.mockReturnValue(undefined);
    prisma.platformProcurementS3Settings.findUnique.mockResolvedValue({
      storageDriver: ProcurementStorageDriver.S3,
      enabled: false,
      localRoot: null,
    });
    const s3cfg = {
      source: 'env' as const,
      endpoint: 'http://x',
      region: 'us-east-1',
      accessKey: 'a',
      secretKey: 's',
      bucket: 'b',
      useSsl: false,
      forcePathStyle: true,
    };
    s3Resolver.resolve.mockResolvedValue(s3cfg);

    const ctx = await service.resolveForOperations();

    expect(ctx).toEqual({ driver: 'S3', config: s3cfg });
  });
});

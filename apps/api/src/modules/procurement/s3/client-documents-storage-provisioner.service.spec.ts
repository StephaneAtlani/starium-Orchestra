import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { mkdtemp } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { access } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { ClientDocumentsStorageProvisionerService } from './client-documents-storage-provisioner.service';
import { ProcurementS3ConfigResolverService } from './procurement-s3-config.resolver.service';
import { ProcurementStorageResolutionService } from './procurement-storage-resolution.service';
import { S3ProcurementBlobStorageService } from './s3-procurement-blob-storage.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('ClientDocumentsStorageProvisionerService', () => {
  const clientId = 'cl_testprovision123';
  const slug = 'acme-test';

  let prisma: {
    client: { findUnique: jest.Mock; update: jest.Mock };
    platformProcurementS3Settings: { findUnique: jest.Mock };
  };
  let resolution: { resolveForOperations: jest.Mock };
  let s3Storage: { putObject: jest.Mock };
  let s3Resolver: { resolve: jest.Mock };
  let config: { get: jest.Mock };

  async function compileService() {
    prisma = {
      client: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      platformProcurementS3Settings: {
        findUnique: jest.fn().mockResolvedValue({
          clientDocumentsBucketPrefix: 'starium-dev_',
        }),
      },
    };
    resolution = { resolveForOperations: jest.fn() };
    s3Storage = {
      putObject: jest.fn().mockResolvedValue({
        bucket: 'starium-dev-acme-test',
        objectKey: '.starium-client-root',
        checksumSha256: 'abc',
      }),
    };
    s3Resolver = { resolve: jest.fn() };
    config = { get: jest.fn().mockReturnValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientDocumentsStorageProvisionerService,
        { provide: ConfigService, useValue: config },
        { provide: PrismaService, useValue: prisma },
        { provide: ProcurementStorageResolutionService, useValue: resolution },
        { provide: S3ProcurementBlobStorageService, useValue: s3Storage },
        { provide: ProcurementS3ConfigResolverService, useValue: s3Resolver },
      ],
    }).compile();

    return module.get(ClientDocumentsStorageProvisionerService);
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('LOCAL : crée le répertoire {root}/{clientId}', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'starium-prov-local-'));
    const svc = await compileService();
    prisma.client.findUnique.mockResolvedValue({
      id: clientId,
      slug,
      documentsBucketName: null,
      documentsBucketProvisionedAt: null,
    });
    resolution.resolveForOperations.mockResolvedValue({
      driver: 'LOCAL',
      root,
    });

    await svc.provisionClientDocumentStorage(clientId);

    await access(path.join(root, clientId), fsConstants.F_OK);
    expect(prisma.client.update).toHaveBeenCalledWith({
      where: { id: clientId },
      data: { documentsBucketProvisionedAt: expect.any(Date) },
    });
    expect(s3Storage.putObject).not.toHaveBeenCalled();
    expect(prisma.platformProcurementS3Settings.findUnique).not.toHaveBeenCalled();
  });

  it('S3 : crée le bucket client (préfixe + slug) et pose le marqueur racine', async () => {
    const svc = await compileService();
    prisma.client.findUnique.mockResolvedValue({
      id: clientId,
      slug,
      documentsBucketName: null,
      documentsBucketProvisionedAt: null,
    });
    resolution.resolveForOperations.mockResolvedValue({
      driver: 'S3',
      config: {
        source: 'db',
        endpoint: '',
        region: 'eu-west-3',
        accessKey: 'k',
        secretKey: 's',
        bucket: 'plat-bucket',
        useSsl: true,
        forcePathStyle: false,
      },
    });
    s3Resolver.resolve.mockResolvedValue({
      source: 'db',
      endpoint: '',
      region: 'eu-west-3',
      accessKey: 'k',
      secretKey: 's',
      bucket: 'plat-bucket',
      useSsl: true,
      forcePathStyle: false,
    });

    await svc.provisionClientDocumentStorage(clientId);

    expect(s3Storage.putObject).toHaveBeenCalledTimes(1);
    const [, params] = s3Storage.putObject.mock.calls[0];
    expect(params.bucket).toBe('starium-dev-acme-test');
    expect(params.objectKey).toBe('.starium-client-root');
    expect(params.body.length).toBeGreaterThan(0);
    expect(params.contentType).toContain('text/plain');
    expect(prisma.client.update).toHaveBeenCalledWith({
      where: { id: clientId },
      data: {
        documentsBucketName: 'starium-dev-acme-test',
        documentsBucketProvisionedAt: expect.any(Date),
      },
    });
  });

  it('S3 : idempotent si le bucket client est déjà enregistré', async () => {
    const svc = await compileService();
    prisma.client.findUnique.mockResolvedValue({
      id: clientId,
      slug,
      documentsBucketName: 'starium-dev-acme-test',
      documentsBucketProvisionedAt: new Date(),
    });
    resolution.resolveForOperations.mockResolvedValue({
      driver: 'S3',
      config: {
        source: 'db',
        endpoint: '',
        region: 'eu-west-3',
        accessKey: 'k',
        secretKey: 's',
        bucket: 'plat-bucket',
        useSsl: true,
        forcePathStyle: false,
      },
    });
    s3Resolver.resolve.mockResolvedValue({
      source: 'db',
      endpoint: '',
      region: 'eu-west-3',
      accessKey: 'k',
      secretKey: 's',
      bucket: 'plat-bucket',
      useSsl: true,
      forcePathStyle: false,
    });

    await svc.provisionClientDocumentStorage(clientId);

    expect(s3Storage.putObject).toHaveBeenCalledTimes(1);
    expect(prisma.client.update).not.toHaveBeenCalled();
  });
});

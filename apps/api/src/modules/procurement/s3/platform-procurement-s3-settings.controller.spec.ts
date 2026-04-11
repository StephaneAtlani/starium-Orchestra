import { ProcurementStorageDriver } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../../../common/guards/platform-admin.guard';
import { PlatformProcurementS3SettingsController } from './platform-procurement-s3-settings.controller';
import { PlatformProcurementS3SettingsService } from './platform-procurement-s3-settings.service';

describe('PlatformProcurementS3SettingsController', () => {
  let controller: PlatformProcurementS3SettingsController;
  let service: jest.Mocked<PlatformProcurementS3SettingsService>;

  const passGuard = { canActivate: () => true };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlatformProcurementS3SettingsController],
      providers: [
        {
          provide: PlatformProcurementS3SettingsService,
          useValue: {
            get: jest.fn(),
            patch: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(passGuard)
      .overrideGuard(PlatformAdminGuard)
      .useValue(passGuard)
      .compile();

    controller = module.get(PlatformProcurementS3SettingsController);
    service = module.get(PlatformProcurementS3SettingsService);
  });

  it('should delegate GET to settings.get', async () => {
    const payload = {
      id: 'default',
      enabled: false,
      storageDriver: ProcurementStorageDriver.S3,
      localRoot: null,
      endpoint: 'http://minio:9000',
      region: 'us-east-1',
      accessKey: 'ak',
      hasSecret: true,
      bucket: 'procurement',
      useSsl: false,
      forcePathStyle: true,
      updatedAt: new Date(),
      effectiveSource: 'env' as const,
      effectiveDriver: 's3' as const,
      effectiveLocalRootSource: 'none' as const,
    };
    service.get.mockResolvedValue(payload);

    const result = await controller.get();

    expect(service.get).toHaveBeenCalledTimes(1);
    expect(result).toEqual(payload);
    expect(result).not.toHaveProperty('secretKey');
    expect(result).not.toHaveProperty('secretKeyEncrypted');
  });

  it('should delegate PATCH to settings.patch', async () => {
    const dto = { enabled: true };
    const payload = {
      id: 'default',
      enabled: true,
      storageDriver: ProcurementStorageDriver.S3,
      localRoot: null,
      endpoint: null,
      region: null,
      accessKey: null,
      hasSecret: false,
      bucket: null,
      useSsl: true,
      forcePathStyle: true,
      updatedAt: new Date(),
      effectiveSource: 'none' as const,
      effectiveDriver: 'local' as const,
      effectiveLocalRootSource: 'none' as const,
    };
    service.patch.mockResolvedValue(payload);

    const result = await controller.patch(dto as never);

    expect(service.patch).toHaveBeenCalledWith(dto);
    expect(result).toEqual(payload);
  });
});

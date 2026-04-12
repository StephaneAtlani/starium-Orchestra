import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { PlatformUploadSettingsService } from './platform-upload-settings.service';
import {
  PLATFORM_UPLOAD_DEFAULT_BYTES,
  PLATFORM_UPLOAD_MIN_BYTES,
} from './platform-upload.constants';

describe('PlatformUploadSettingsService', () => {
  let service: PlatformUploadSettingsService;
  let prisma: {
    platformUploadSettings: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      upsert: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      platformUploadSettings: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformUploadSettingsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(PlatformUploadSettingsService);
  });

  it('get clamps stored value below min', async () => {
    prisma.platformUploadSettings.findUnique.mockResolvedValue({
      id: 'default',
      maxUploadBytes: 100,
      updatedAt: new Date(),
    });

    const out = await service.get();

    expect(out.maxUploadBytes).toBe(PLATFORM_UPLOAD_MIN_BYTES);
  });

  it('patch updates cache for getEffectiveMaxBytes', async () => {
    const target = 20 * 1024 * 1024;
    prisma.platformUploadSettings.upsert.mockResolvedValue({
      id: 'default',
      maxUploadBytes: target,
      updatedAt: new Date(),
    });
    prisma.platformUploadSettings.findUnique.mockResolvedValue({
      id: 'default',
      maxUploadBytes: target,
      updatedAt: new Date(),
    });

    await service.patch({ maxUploadBytes: target });

    expect(service.getEffectiveMaxBytes()).toBe(target);
  });

  it('onModuleInit seeds default when row missing', async () => {
    prisma.platformUploadSettings.findUnique.mockResolvedValue(null);
    prisma.platformUploadSettings.create.mockResolvedValue({
      id: 'default',
      maxUploadBytes: PLATFORM_UPLOAD_DEFAULT_BYTES,
      updatedAt: new Date(),
    });

    await service.onModuleInit();

    expect(prisma.platformUploadSettings.create).toHaveBeenCalled();
    expect(service.getEffectiveMaxBytes()).toBe(PLATFORM_UPLOAD_DEFAULT_BYTES);
  });
});

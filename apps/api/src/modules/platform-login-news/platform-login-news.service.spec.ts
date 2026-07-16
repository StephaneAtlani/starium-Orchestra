import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { PlatformLoginNewsService } from './platform-login-news.service';

describe('PlatformLoginNewsService', () => {
  let service: PlatformLoginNewsService;
  let prisma: {
    platformLoginNews: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      platformLoginNews: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformLoginNewsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(PlatformLoginNewsService);
  });

  it('getPublic returns null when row is missing', async () => {
    prisma.platformLoginNews.findUnique.mockResolvedValue(null);
    await expect(service.getPublic()).resolves.toEqual({ message: null });
  });

  it('getPublic trims and drops blank message', async () => {
    prisma.platformLoginNews.findUnique.mockResolvedValue({
      id: 'default',
      message: '   ',
      updatedAt: new Date(),
    });
    await expect(service.getPublic()).resolves.toEqual({ message: null });
  });

  it('patch stores trimmed message', async () => {
    const updatedAt = new Date('2026-07-16T10:00:00.000Z');
    prisma.platformLoginNews.upsert.mockResolvedValue({
      id: 'default',
      message: 'Maintenance ce soir',
      updatedAt,
    });
    prisma.platformLoginNews.findUnique.mockResolvedValue({
      id: 'default',
      message: 'Maintenance ce soir',
      updatedAt,
    });

    const out = await service.patch({ message: '  Maintenance ce soir  ' });

    expect(prisma.platformLoginNews.upsert).toHaveBeenCalledWith({
      where: { id: 'default' },
      create: { id: 'default', message: 'Maintenance ce soir' },
      update: { message: 'Maintenance ce soir' },
    });
    expect(out.message).toBe('Maintenance ce soir');
  });

  it('patch clears message with null', async () => {
    prisma.platformLoginNews.upsert.mockResolvedValue({
      id: 'default',
      message: null,
      updatedAt: new Date(),
    });
    prisma.platformLoginNews.findUnique.mockResolvedValue({
      id: 'default',
      message: null,
      updatedAt: new Date(),
    });

    await service.patch({ message: null });

    expect(prisma.platformLoginNews.upsert).toHaveBeenCalledWith({
      where: { id: 'default' },
      create: { id: 'default', message: null },
      update: { message: null },
    });
  });
});

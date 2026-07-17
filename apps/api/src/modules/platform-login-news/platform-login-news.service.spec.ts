import { Test, TestingModule } from '@nestjs/testing';
import { PlatformLoginNewsType } from '@prisma/client';
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

  it('getPublic returns null message and INFORMATION when row is missing', async () => {
    prisma.platformLoginNews.findUnique.mockResolvedValue(null);
    await expect(service.getPublic()).resolves.toEqual({
      message: null,
      messageType: PlatformLoginNewsType.INFORMATION,
    });
  });

  it('getPublic trims and drops blank message', async () => {
    prisma.platformLoginNews.findUnique.mockResolvedValue({
      id: 'default',
      message: '   ',
      messageType: PlatformLoginNewsType.WARNING,
      updatedAt: new Date(),
    });
    await expect(service.getPublic()).resolves.toEqual({
      message: null,
      messageType: PlatformLoginNewsType.WARNING,
    });
  });

  it('patch stores trimmed message and message type', async () => {
    const updatedAt = new Date('2026-07-16T10:00:00.000Z');
    prisma.platformLoginNews.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'default',
        message: 'Maintenance ce soir',
        messageType: PlatformLoginNewsType.URGENT,
        updatedAt,
      });
    prisma.platformLoginNews.upsert.mockResolvedValue({
      id: 'default',
      message: 'Maintenance ce soir',
      messageType: PlatformLoginNewsType.URGENT,
      updatedAt,
    });

    const out = await service.patch({
      message: '  Maintenance ce soir  ',
      messageType: PlatformLoginNewsType.URGENT,
    });

    expect(prisma.platformLoginNews.upsert).toHaveBeenCalledWith({
      where: { id: 'default' },
      create: {
        id: 'default',
        message: 'Maintenance ce soir',
        messageType: PlatformLoginNewsType.URGENT,
      },
      update: {
        message: 'Maintenance ce soir',
        messageType: PlatformLoginNewsType.URGENT,
      },
    });
    expect(out.message).toBe('Maintenance ce soir');
    expect(out.messageType).toBe(PlatformLoginNewsType.URGENT);
  });

  it('patch clears message with null and keeps existing type', async () => {
    prisma.platformLoginNews.findUnique
      .mockResolvedValueOnce({
        id: 'default',
        message: 'Ancien message',
        messageType: PlatformLoginNewsType.WARNING,
        updatedAt: new Date(),
      })
      .mockResolvedValueOnce({
        id: 'default',
        message: null,
        messageType: PlatformLoginNewsType.WARNING,
        updatedAt: new Date(),
      });
    prisma.platformLoginNews.upsert.mockResolvedValue({
      id: 'default',
      message: null,
      messageType: PlatformLoginNewsType.WARNING,
      updatedAt: new Date(),
    });

    await service.patch({ message: null });

    expect(prisma.platformLoginNews.upsert).toHaveBeenCalledWith({
      where: { id: 'default' },
      create: {
        id: 'default',
        message: null,
        messageType: PlatformLoginNewsType.WARNING,
      },
      update: {
        message: null,
        messageType: PlatformLoginNewsType.WARNING,
      },
    });
  });
});

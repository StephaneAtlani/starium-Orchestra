import { BadRequestException } from '@nestjs/common';
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
      startsAt: null,
      endsAt: null,
    });
  });

  it('getPublic hides message before startsAt', async () => {
    prisma.platformLoginNews.findUnique.mockResolvedValue({
      id: 'default',
      message: 'Maintenance',
      messageType: PlatformLoginNewsType.WARNING,
      startsAt: new Date('2099-01-01T10:00:00.000Z'),
      endsAt: null,
      updatedAt: new Date(),
    });

    await expect(service.getPublic()).resolves.toEqual({
      message: null,
      messageType: PlatformLoginNewsType.WARNING,
      startsAt: null,
      endsAt: null,
    });
  });

  it('getPublic hides message after endsAt', async () => {
    prisma.platformLoginNews.findUnique.mockResolvedValue({
      id: 'default',
      message: 'Maintenance',
      messageType: PlatformLoginNewsType.WARNING,
      startsAt: null,
      endsAt: new Date('2000-01-01T10:00:00.000Z'),
      updatedAt: new Date(),
    });

    await expect(service.getPublic()).resolves.toEqual({
      message: null,
      messageType: PlatformLoginNewsType.WARNING,
      startsAt: null,
      endsAt: null,
    });
  });

  it('getPublic returns message with schedule when within window', async () => {
    const startsAt = new Date('2000-01-01T10:00:00.000Z');
    const endsAt = new Date('2099-01-01T10:00:00.000Z');
    prisma.platformLoginNews.findUnique.mockResolvedValue({
      id: 'default',
      message: 'Maintenance',
      messageType: PlatformLoginNewsType.URGENT,
      startsAt,
      endsAt,
      updatedAt: new Date(),
    });

    await expect(service.getPublic()).resolves.toEqual({
      message: 'Maintenance',
      messageType: PlatformLoginNewsType.URGENT,
      startsAt,
      endsAt,
    });
  });

  it('patch stores trimmed message, message type and schedule', async () => {
    const updatedAt = new Date('2026-07-16T10:00:00.000Z');
    const startsAt = new Date('2026-07-20T18:00:00.000Z');
    const endsAt = new Date('2026-07-20T23:00:00.000Z');
    prisma.platformLoginNews.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'default',
        message: 'Maintenance ce soir',
        messageType: PlatformLoginNewsType.URGENT,
        startsAt,
        endsAt,
        updatedAt,
      });
    prisma.platformLoginNews.upsert.mockResolvedValue({
      id: 'default',
      message: 'Maintenance ce soir',
      messageType: PlatformLoginNewsType.URGENT,
      startsAt,
      endsAt,
      updatedAt,
    });

    const out = await service.patch({
      message: '  Maintenance ce soir  ',
      messageType: PlatformLoginNewsType.URGENT,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
    });

    expect(prisma.platformLoginNews.upsert).toHaveBeenCalledWith({
      where: { id: 'default' },
      create: {
        id: 'default',
        message: 'Maintenance ce soir',
        messageType: PlatformLoginNewsType.URGENT,
        startsAt,
        endsAt,
      },
      update: {
        message: 'Maintenance ce soir',
        messageType: PlatformLoginNewsType.URGENT,
        startsAt,
        endsAt,
      },
    });
    expect(out.message).toBe('Maintenance ce soir');
    expect(out.startsAt).toEqual(startsAt);
    expect(out.endsAt).toEqual(endsAt);
  });

  it('patch rejects endsAt before startsAt', async () => {
    prisma.platformLoginNews.findUnique.mockResolvedValue(null);

    await expect(
      service.patch({
        message: 'Test',
        startsAt: '2026-07-21T23:00:00.000Z',
        endsAt: '2026-07-20T18:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('patch clears message with null and keeps existing schedule', async () => {
    const startsAt = new Date('2026-07-20T18:00:00.000Z');
    prisma.platformLoginNews.findUnique
      .mockResolvedValueOnce({
        id: 'default',
        message: 'Ancien message',
        messageType: PlatformLoginNewsType.WARNING,
        startsAt,
        endsAt: null,
        updatedAt: new Date(),
      })
      .mockResolvedValueOnce({
        id: 'default',
        message: null,
        messageType: PlatformLoginNewsType.WARNING,
        startsAt,
        endsAt: null,
        updatedAt: new Date(),
      });
    prisma.platformLoginNews.upsert.mockResolvedValue({
      id: 'default',
      message: null,
      messageType: PlatformLoginNewsType.WARNING,
      startsAt,
      endsAt: null,
      updatedAt: new Date(),
    });

    await service.patch({ message: null });

    expect(prisma.platformLoginNews.upsert).toHaveBeenCalledWith({
      where: { id: 'default' },
      create: {
        id: 'default',
        message: null,
        messageType: PlatformLoginNewsType.WARNING,
        startsAt,
        endsAt: null,
      },
      update: {
        message: null,
        messageType: PlatformLoginNewsType.WARNING,
        startsAt,
        endsAt: null,
      },
    });
  });
});

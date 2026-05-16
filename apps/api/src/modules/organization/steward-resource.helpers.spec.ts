import { ResourceType } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  assertStewardHumanResource,
  toStewardDisplayName,
  toStewardSummary,
} from './steward-resource.helpers';

describe('steward-resource.helpers', () => {
  const prisma = {
    resource: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(() => jest.clearAllMocks());

  it('toStewardDisplayName joins firstName and name', () => {
    expect(
      toStewardDisplayName({ firstName: 'Ada', name: 'Lovelace' }),
    ).toBe('Ada Lovelace');
  });

  it('toStewardSummary returns null when resource missing', () => {
    expect(toStewardSummary(null)).toBeNull();
  });

  it('assertStewardHumanResource accepts HUMAN same client', async () => {
    prisma.resource.findFirst.mockResolvedValue({
      id: 'r1',
      type: ResourceType.HUMAN,
    });
    await expect(
      assertStewardHumanResource(prisma as never, 'c1', 'r1'),
    ).resolves.toBeUndefined();
  });

  it('assertStewardHumanResource rejects non-HUMAN', async () => {
    prisma.resource.findFirst.mockResolvedValue({
      id: 'r1',
      type: ResourceType.MATERIAL,
    });
    await expect(
      assertStewardHumanResource(prisma as never, 'c1', 'r1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('assertStewardHumanResource rejects missing resource', async () => {
    prisma.resource.findFirst.mockResolvedValue(null);
    await expect(
      assertStewardHumanResource(prisma as never, 'c1', 'r1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

import 'reflect-metadata';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { GovernanceCycleItemSourceType } from '@prisma/client';
import { CreateGovernanceCycleItemDto } from './create-governance-cycle-item.dto';

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

describe('CreateGovernanceCycleItemDto — scoring', () => {
  it('accepte valueScore null en create', async () => {
    const result = await pipe.transform(
      {
        sourceType: GovernanceCycleItemSourceType.MANUAL,
        title: 'Sujet libre',
        valueScore: null,
      },
      { type: 'body', metatype: CreateGovernanceCycleItemDto },
    );

    expect(result.valueScore).toBeNull();
  });

  it('accepte valueScore 3 en create', async () => {
    const result = await pipe.transform(
      {
        sourceType: GovernanceCycleItemSourceType.MANUAL,
        title: 'Sujet libre',
        valueScore: 3,
      },
      { type: 'body', metatype: CreateGovernanceCycleItemDto },
    );

    expect(result.valueScore).toBe(3);
  });

  it('rejette valueScore 0 ou 6', async () => {
    await expect(
      pipe.transform(
        {
          sourceType: GovernanceCycleItemSourceType.MANUAL,
          title: 'Sujet libre',
          valueScore: 0,
        },
        { type: 'body', metatype: CreateGovernanceCycleItemDto },
      ),
    ).rejects.toThrow(BadRequestException);

    await expect(
      pipe.transform(
        {
          sourceType: GovernanceCycleItemSourceType.MANUAL,
          title: 'Sujet libre',
          valueScore: 6,
        },
        { type: 'body', metatype: CreateGovernanceCycleItemDto },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejette priorityScore en entrée (forbidNonWhitelisted)', async () => {
    await expect(
      pipe.transform(
        {
          sourceType: GovernanceCycleItemSourceType.MANUAL,
          title: 'Sujet libre',
          priorityScore: 42,
        },
        { type: 'body', metatype: CreateGovernanceCycleItemDto },
      ),
    ).rejects.toThrow(BadRequestException);
  });
});

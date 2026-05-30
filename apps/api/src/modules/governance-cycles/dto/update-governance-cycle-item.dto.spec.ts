import 'reflect-metadata';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { UpdateGovernanceCycleItemDto } from './update-governance-cycle-item.dto';

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

describe('UpdateGovernanceCycleItemDto — scoring', () => {
  it('accepte valueScore null en update (effacement)', async () => {
    const result = await pipe.transform(
      { valueScore: null },
      { type: 'body', metatype: UpdateGovernanceCycleItemDto },
    );

    expect(result.valueScore).toBeNull();
  });

  it('accepte valueScore 4 en update', async () => {
    const result = await pipe.transform(
      { valueScore: 4 },
      { type: 'body', metatype: UpdateGovernanceCycleItemDto },
    );

    expect(result.valueScore).toBe(4);
  });

  it('rejette priorityScore en entrée (forbidNonWhitelisted)', async () => {
    await expect(
      pipe.transform(
        { priorityScore: 42 },
        { type: 'body', metatype: UpdateGovernanceCycleItemDto },
      ),
    ).rejects.toThrow(BadRequestException);
  });
});

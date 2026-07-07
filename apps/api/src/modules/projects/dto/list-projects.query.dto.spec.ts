import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ListProjectsQueryDto } from './list-projects.query.dto';

const TAG_A = 'cmnkqlkcb0003o3a5mumz04sn';
const TAG_B = 'cmnkqlkcb0003o3a5mumz04so';

describe('ListProjectsQueryDto — tagIds', () => {
  async function validateDto(input: Record<string, unknown>) {
    const dto = plainToInstance(ListProjectsQueryDto, input);
    return validate(dto);
  }

  it('parse tagIds=id1,id2 avec trim et déduplication', async () => {
    const errors = await validateDto({
      tagIds: `${TAG_A}, ${TAG_B},${TAG_A}`,
    });
    expect(errors).toHaveLength(0);
    const dto = plainToInstance(ListProjectsQueryDto, {
      tagIds: `${TAG_A}, ${TAG_B},${TAG_A}`,
    });
    expect(dto.tagIds).toEqual([TAG_A, TAG_B]);
  });

  it('rejette un CUID invalide', async () => {
    const errors = await validateDto({ tagIds: 'not-a-cuid' });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'tagIds')).toBe(true);
  });

  it('ignore tagIds vide après normalisation', async () => {
    const dto = plainToInstance(ListProjectsQueryDto, { tagIds: '  ,  ' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.tagIds).toBeUndefined();
  });

  it('accepte tagIdsMatch any ou all', async () => {
    const dtoAny = plainToInstance(ListProjectsQueryDto, {
      tagIds: TAG_A,
      tagIdsMatch: 'any',
    });
    const dtoAll = plainToInstance(ListProjectsQueryDto, {
      tagIds: `${TAG_A},${TAG_B}`,
      tagIdsMatch: 'all',
    });
    expect(await validate(dtoAny)).toHaveLength(0);
    expect(await validate(dtoAll)).toHaveLength(0);
    expect(dtoAll.tagIdsMatch).toBe('all');
  });

  it('rejette tagIdsMatch invalide', async () => {
    const errors = await validateDto({ tagIds: TAG_A, tagIdsMatch: 'xor' });
    expect(errors.some((e) => e.property === 'tagIdsMatch')).toBe(true);
  });
});

describe('ListProjectsQueryDto — filtres booléens', () => {
  it('parse lateOnly et atRiskOnly depuis 1 ou true', async () => {
    const dto = plainToInstance(ListProjectsQueryDto, {
      lateOnly: '1',
      atRiskOnly: 'true',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.lateOnly).toBe(true);
    expect(dto.atRiskOnly).toBe(true);
  });

  it('parse rootOnly depuis true', async () => {
    const dto = plainToInstance(ListProjectsQueryDto, { rootOnly: 'true' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.rootOnly).toBe(true);
  });
});

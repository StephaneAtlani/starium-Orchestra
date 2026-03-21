import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { UpdateProjectSheetDto } from './update-project-sheet.dto';

function validate(dto: UpdateProjectSheetDto) {
  return validateSync(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
}

describe('UpdateProjectSheetDto — SWOT/TOWS', () => {
  it('rejette SWOT > 3 éléments', () => {
    const dto = plainToInstance(UpdateProjectSheetDto, {
      swotStrengths: ['a', 'b', 'c', 'd'],
    });
    expect(validate(dto).length).toBeGreaterThan(0);
  });

  it('accepte SWOT ≤ 3', () => {
    const dto = plainToInstance(UpdateProjectSheetDto, {
      swotStrengths: ['a', 'b', 'c'],
    });
    expect(validate(dto)).toHaveLength(0);
  });

  it('rejette SWOT vide si fourni', () => {
    const dto = plainToInstance(UpdateProjectSheetDto, {
      swotStrengths: [],
    });
    expect(validate(dto).length).toBeGreaterThan(0);
  });

  it('rejette TOWS > 2 par quadrant', () => {
    const dto = plainToInstance(UpdateProjectSheetDto, {
      towsActions: { SO: ['a', 'b', 'c'] },
    });
    expect(validate(dto).length).toBeGreaterThan(0);
  });

  it('accepte TOWS ≤ 2 par quadrant', () => {
    const dto = plainToInstance(UpdateProjectSheetDto, {
      towsActions: { SO: ['x', 'y'], WT: ['z'] },
    });
    expect(validate(dto)).toHaveLength(0);
  });

  it('rejette plus de 200 KPI de succès', () => {
    const dto = plainToInstance(UpdateProjectSheetDto, {
      businessSuccessKpis: Array.from({ length: 201 }, (_, i) => `k${i}`),
    });
    expect(validate(dto).length).toBeGreaterThan(0);
  });

  it('accepte une liste de KPI raisonnable', () => {
    const dto = plainToInstance(UpdateProjectSheetDto, {
      businessSuccessKpis: ['a', 'b'],
    });
    expect(validate(dto)).toHaveLength(0);
  });
});

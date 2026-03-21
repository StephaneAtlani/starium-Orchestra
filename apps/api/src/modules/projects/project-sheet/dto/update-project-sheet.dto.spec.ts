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
  it('rejette SWOT > 200 éléments', () => {
    const dto = plainToInstance(UpdateProjectSheetDto, {
      swotStrengths: Array.from({ length: 201 }, (_, i) => `s${i}`),
    });
    expect(validate(dto).length).toBeGreaterThan(0);
  });

  it('accepte SWOT liste longue (≤ 200)', () => {
    const dto = plainToInstance(UpdateProjectSheetDto, {
      swotStrengths: ['a', 'b', 'c', 'd'],
    });
    expect(validate(dto)).toHaveLength(0);
  });

  it('accepte SWOT [] (effacement)', () => {
    const dto = plainToInstance(UpdateProjectSheetDto, {
      swotStrengths: [],
    });
    expect(validate(dto)).toHaveLength(0);
  });

  it('rejette TOWS > 200 par quadrant', () => {
    const dto = plainToInstance(UpdateProjectSheetDto, {
      towsActions: { SO: Array.from({ length: 201 }, (_, i) => `x${i}`) },
    });
    expect(validate(dto).length).toBeGreaterThan(0);
  });

  it('accepte TOWS plusieurs lignes par quadrant', () => {
    const dto = plainToInstance(UpdateProjectSheetDto, {
      towsActions: { SO: ['x', 'y', 'z'], WT: ['a', 'b'] },
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

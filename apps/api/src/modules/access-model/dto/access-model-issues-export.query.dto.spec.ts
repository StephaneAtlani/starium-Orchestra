import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AccessModelIssuesExportQueryDto } from './access-model-issues-export.query.dto';

describe('AccessModelIssuesExportQueryDto', () => {
  it('valide category et filtres optionnels', async () => {
    const dto = plainToInstance(AccessModelIssuesExportQueryDto, {
      category: 'missing_owner',
      module: 'projects',
      search: 'alpha',
      delimiter: ';',
      format: 'csv',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.category).toBe('missing_owner');
    expect(dto.delimiter).toBe(';');
  });

  it('refuse delimiter invalide', async () => {
    const dto = plainToInstance(AccessModelIssuesExportQueryDto, {
      category: 'missing_owner',
      delimiter: '|',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('ne déclare pas page ni limit sur le DTO export', () => {
    const instance = new AccessModelIssuesExportQueryDto();
    instance.category = 'missing_human';
    expect(Object.prototype.hasOwnProperty.call(instance, 'page')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(instance, 'limit')).toBe(false);
    expect('page' in instance).toBe(false);
    expect('limit' in instance).toBe(false);
  });
});

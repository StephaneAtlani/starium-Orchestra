import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateTeamsChannelTemplateDto } from './create-teams-channel-template.dto';

describe('CreateTeamsChannelTemplateDto', () => {
  it('accepte un nom de canal valide', () => {
    const inst = plainToInstance(CreateTeamsChannelTemplateDto, {
      displayName: 'Pilotage',
      description: 'Canal principal',
      isPrimary: true,
    });
    const errors = validateSync(inst);
    expect(errors).toHaveLength(0);
  });

  it('refuse les caractères interdits par Teams dans displayName', () => {
    for (const forbidden of ['#', '~', ':', '?', '"', "'"]) {
      const inst = plainToInstance(CreateTeamsChannelTemplateDto, {
        displayName: `Pilotage${forbidden}`,
        isPrimary: false,
      });
      const errors = validateSync(inst, { transform: true });
      expect(errors.length).toBeGreaterThan(0);
    }
  });

  it('refuse un displayName vide', () => {
    const inst = plainToInstance(CreateTeamsChannelTemplateDto, {
      displayName: '   ',
      isPrimary: false,
    });
    const errors = validateSync(inst, { transform: true });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('refuse un displayName > 50 caractères', () => {
    const inst = plainToInstance(CreateTeamsChannelTemplateDto, {
      displayName: 'a'.repeat(51),
      isPrimary: false,
    });
    const errors = validateSync(inst);
    expect(errors.length).toBeGreaterThan(0);
  });
});

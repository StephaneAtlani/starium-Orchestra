import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { UpdateTeamsProvisioningSettingsDto } from './update-teams-provisioning-settings.dto';

describe('UpdateTeamsProvisioningSettingsDto', () => {
  it('accepte un payload valide', () => {
    const inst = plainToInstance(UpdateTeamsProvisioningSettingsDto, {
      isEnabled: true,
      offerOnProjectCreate: true,
      teamNameTemplate: '{{code}} - {{name}}',
      teamDescriptionTemplate: 'Projet {{name}}',
    });
    const errors = validateSync(inst);
    expect(errors).toHaveLength(0);
    expect(inst.isEnabled).toBe(true);
    expect(inst.offerOnProjectCreate).toBe(true);
  });

  it('accepte les booléens natifs', () => {
    const inst = plainToInstance(UpdateTeamsProvisioningSettingsDto, {
      isEnabled: true,
      offerOnProjectCreate: false,
      teamNameTemplate: '{{code}}',
    });
    const errors = validateSync(inst);
    expect(errors).toHaveLength(0);
    expect(inst.isEnabled).toBe(true);
    expect(inst.offerOnProjectCreate).toBe(false);
  });

  it('refuse un teamNameTemplate vide', () => {
    const inst = plainToInstance(UpdateTeamsProvisioningSettingsDto, {
      isEnabled: false,
      offerOnProjectCreate: false,
      teamNameTemplate: '',
    });
    const errors = validateSync(inst);
    expect(errors.length).toBeGreaterThan(0);
  });
});

import { describe, it, expect } from 'vitest';
import { resourcePickerLabel } from './resource-label';

describe('resourcePickerLabel', () => {
  it('affiche prénom et nom, pas un identifiant technique', () => {
    expect(
      resourcePickerLabel({ firstName: 'Marie', name: 'Curie', code: 'MC-01' }),
    ).toBe('Marie Curie — MC-01');
  });
});

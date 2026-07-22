import { normalizeEmailForRegistry } from './email-normalization';

describe('email-normalization', () => {
  it('normalise casse et espaces', () => {
    expect(normalizeEmailForRegistry('  User@Domain.FR ')).toBe('user@domain.fr');
  });

  it('ne modifie pas les alias +', () => {
    expect(normalizeEmailForRegistry('user+tag@domain.fr')).toBe('user+tag@domain.fr');
  });
});

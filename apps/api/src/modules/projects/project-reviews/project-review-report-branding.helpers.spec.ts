import {
  buildClientInitialsLogoDataUri,
  extractClientInitials,
  resolveReportClientLogoUrl,
} from './project-review-report-branding.helpers';

describe('project-review-report-branding.helpers', () => {
  it('extrait les initiales entreprise', () => {
    expect(extractClientInitials('NeoTech AI')).toBe('NA');
    expect(extractClientInitials('Starium')).toBe('ST');
  });

  it('génère un logo data URI pour le client', () => {
    const uri = buildClientInitialsLogoDataUri('NeoTech AI');
    expect(uri.startsWith('data:image/svg+xml')).toBe(true);
    expect(decodeURIComponent(uri)).toContain('NA');
  });

  it('priorise un logoUrl custom absolu', () => {
    expect(
      resolveReportClientLogoUrl({
        clientName: 'NeoTech AI',
        clientLogoUrl: 'https://cdn.example.com/logo.png',
      }),
    ).toBe('https://cdn.example.com/logo.png');
  });
});

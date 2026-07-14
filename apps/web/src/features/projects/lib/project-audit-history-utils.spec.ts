import { describe, expect, it } from 'vitest';
import {
  formatProjectHistoryWhen,
  getProjectAuditActionVisual,
  projectAuditActionVerb,
} from './project-audit-history-utils';

describe('project-audit-history-utils', () => {
  it('retourne un visuel par action connue', () => {
    const visual = getProjectAuditActionVisual('project.sheet.updated');
    expect(visual.abbr).toBe('FCH');
    expect(visual.dotClass).toContain('rose');
  });

  it('retourne le verbe métier FR', () => {
    expect(projectAuditActionVerb('project.owner.updated', 'fr')).toBe('a modifié le responsable');
  });

  it('formate une date récente en relatif FR', () => {
    const recent = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
    expect(formatProjectHistoryWhen(recent, 'fr')).toBe('Il y a 2 h');
  });

  it('formate une date absolue FR au-delà de 24 h', () => {
    const old = new Date('2026-04-16T09:47:00.000Z').toISOString();
    const formatted = formatProjectHistoryWhen(old, 'fr');
    expect(formatted).toMatch(/avr\./i);
    expect(formatted).toMatch(/à/);
  });
});

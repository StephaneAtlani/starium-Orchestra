import { describe, expect, it } from 'vitest';
import { ACCESS_COCKPIT_SHORTCUTS } from './shortcuts';

describe('access-cockpit shortcuts — RFC-ACL-010', () => {
  it('exposes only the canonical access-groups route', () => {
    const hrefs = ACCESS_COCKPIT_SHORTCUTS.map((s) => s.href);
    expect(hrefs).toContain('/client/administration/access-groups');
    expect(hrefs).not.toContain('/client/access-groups');
  });

  it('does not expose any legacy access-groups subpath', () => {
    for (const s of ACCESS_COCKPIT_SHORTCUTS) {
      expect(s.href.startsWith('/client/access-groups')).toBe(false);
    }
  });

  it('exposes module visibility, members and roles canonical routes', () => {
    const hrefs = ACCESS_COCKPIT_SHORTCUTS.map((s) => s.href);
    expect(hrefs).toEqual(
      expect.arrayContaining([
        '/client/administration/access-groups',
        '/client/administration/module-visibility',
        '/client/members',
        '/client/roles',
      ]),
    );
  });

  it('every label is human-readable, never an identifier', () => {
    for (const s of ACCESS_COCKPIT_SHORTCUTS) {
      expect(s.title.trim().length).toBeGreaterThan(2);
      // Pas de UUID/CUID qui transparaîtrait dans le libellé.
      expect(s.title).not.toMatch(/^[a-z0-9]{20,}$/i);
    }
  });
});

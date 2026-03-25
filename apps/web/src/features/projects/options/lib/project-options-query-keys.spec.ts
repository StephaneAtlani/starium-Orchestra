import { describe, expect, it } from 'vitest';
import { projectOptionsKeys } from './project-options-query-keys';

describe('projectOptionsKeys', () => {
  it('includes clientId in all keys', () => {
    const clientId = 'client-1';
    const projectId = 'proj-1';
    expect(projectOptionsKeys.all(clientId)).toContain(clientId);
    expect(projectOptionsKeys.detail(clientId, projectId)).toContain(clientId);
    expect(projectOptionsKeys.detail(clientId, projectId)).toContain(projectId);
    expect(projectOptionsKeys.microsoftLink(clientId, projectId)).toContain(clientId);
    expect(projectOptionsKeys.microsoftLink(clientId, projectId)).toContain(projectId);
  });

  it('produces different keys for different clients', () => {
    const k1 = projectOptionsKeys.microsoftLink('c1', 'p1');
    const k2 = projectOptionsKeys.microsoftLink('c2', 'p1');
    expect(k1).not.toEqual(k2);
  });

  it('detail and microsoftLink are distinct for same ids', () => {
    const clientId = 'c';
    const projectId = 'p';
    expect(projectOptionsKeys.detail(clientId, projectId)).not.toEqual(
      projectOptionsKeys.microsoftLink(clientId, projectId),
    );
  });
});

import { describe, expect, it } from 'vitest';
import {
  collaboratorStatusLabel,
  collaboratorSourceLabel,
  collaboratorManagerSecondaryLabel,
} from './collaborator-label-mappers';

describe('collaboratorStatusLabel', () => {
  it.each([
    ['ACTIVE', 'Actif'],
    ['INACTIVE', 'Inactif'],
    ['DISABLED_SYNC', 'Sync désactivée'],
  ] as const)('%s -> %s', (status, expected) => {
    expect(collaboratorStatusLabel(status)).toBe(expected);
  });
});

describe('collaboratorSourceLabel', () => {
  it.each([
    ['MANUAL', 'Manuel'],
    ['DIRECTORY_SYNC', 'Annuaire'],
  ] as const)('%s -> %s', (source, expected) => {
    expect(collaboratorSourceLabel(source)).toBe(expected);
  });
});

describe('collaboratorManagerSecondaryLabel', () => {
  it('returns email when present', () => {
    expect(
      collaboratorManagerSecondaryLabel({
        id: '1',
        displayName: 'Alice',
        email: 'alice@acme.com',
        jobTitle: 'CTO',
      }),
    ).toBe('alice@acme.com');
  });

  it('falls back to jobTitle when email is absent', () => {
    expect(
      collaboratorManagerSecondaryLabel({
        id: '1',
        displayName: 'Bob',
        email: null,
        jobTitle: 'Dev Lead',
      }),
    ).toBe('Dev Lead');
  });

  it('falls back to jobTitle when email is blank', () => {
    expect(
      collaboratorManagerSecondaryLabel({
        id: '1',
        displayName: 'Bob',
        email: '   ',
        jobTitle: 'Dev Lead',
      }),
    ).toBe('Dev Lead');
  });

  it('returns null when neither email nor jobTitle', () => {
    expect(
      collaboratorManagerSecondaryLabel({
        id: '1',
        displayName: 'Charlie',
        email: null,
        jobTitle: null,
      }),
    ).toBeNull();
  });
});

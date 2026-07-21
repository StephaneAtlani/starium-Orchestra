import { describe, expect, it } from 'vitest';
import {
  buildNotifiedIdsStorageKey,
  readNotifiedIds,
  rememberNotifiedIds,
  shouldSurfaceBrowserNotification,
} from './browser-notifications';

describe('browser-notifications', () => {
  it('buildNotifiedIdsStorageKey scope user + client', () => {
    expect(buildNotifiedIdsStorageKey('user-1', 'client-1')).toBe(
      'starium.notifications.browserNotified:user-1:client-1',
    );
  });

  it('rememberNotifiedIds persiste et déduplique', () => {
    const userId = 'user-a';
    const clientId = 'client-a';
    rememberNotifiedIds(userId, clientId, ['n1', 'n2']);
    rememberNotifiedIds(userId, clientId, ['n2', 'n3']);
    expect(readNotifiedIds(userId, clientId)).toEqual(new Set(['n1', 'n2', 'n3']));
  });

  it('shouldSurfaceBrowserNotification uniquement en arrière-plan', () => {
    expect(shouldSurfaceBrowserNotification(true)).toBe(true);
    expect(shouldSurfaceBrowserNotification(false)).toBe(false);
  });
});

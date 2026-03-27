import { MemoryMicrosoftOAuthStateStore } from './microsoft-oauth-state.store';

describe('MemoryMicrosoftOAuthStateStore', () => {
  it('consume returns true once then false (one-time)', async () => {
    const store = new MemoryMicrosoftOAuthStateStore();
    await store.register({
      stateToken: 'state-1',
      userId: 'u1',
      clientId: 'c1',
      redirectUri: 'http://localhost/cb',
      ttlMs: 60_000,
    });
    await expect(store.consume('state-1')).resolves.toBe(true);
    await expect(store.consume('state-1')).resolves.toBe(false);
  });

  it('rejects unknown state', async () => {
    const store = new MemoryMicrosoftOAuthStateStore();
    await expect(store.consume('unknown')).resolves.toBe(false);
  });
});

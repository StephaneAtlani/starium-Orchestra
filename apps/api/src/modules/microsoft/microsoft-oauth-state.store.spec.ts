import { MemoryMicrosoftOAuthStateStore } from './microsoft-oauth-state.store';

describe('MemoryMicrosoftOAuthStateStore', () => {
  it('consume returns true once then false (one-time)', async () => {
    const store = new MemoryMicrosoftOAuthStateStore();
    await store.register('jti-1', 60_000);
    expect(await store.consume('jti-1')).toBe(true);
    expect(await store.consume('jti-1')).toBe(false);
  });

  it('rejects unknown jti', async () => {
    const store = new MemoryMicrosoftOAuthStateStore();
    expect(await store.consume('unknown')).toBe(false);
  });
});

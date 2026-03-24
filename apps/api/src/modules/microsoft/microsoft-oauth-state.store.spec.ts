import { MemoryMicrosoftOAuthStateStore } from './microsoft-oauth-state.store';

describe('MemoryMicrosoftOAuthStateStore', () => {
  it('consume returns true once then false (one-time)', () => {
    const store = new MemoryMicrosoftOAuthStateStore();
    store.register('jti-1', 60_000);
    expect(store.consume('jti-1')).toBe(true);
    expect(store.consume('jti-1')).toBe(false);
  });

  it('rejects unknown jti', () => {
    const store = new MemoryMicrosoftOAuthStateStore();
    expect(store.consume('unknown')).toBe(false);
  });
});

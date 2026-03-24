import { MicrosoftRefreshLockService } from './microsoft-refresh-lock.service';

describe('MicrosoftRefreshLockService', () => {
  it('concurrent runExclusive shares one promise', async () => {
    const lock = new MicrosoftRefreshLockService();
    let calls = 0;
    const slow = () =>
      new Promise<string>((resolve) => {
        calls += 1;
        setTimeout(() => resolve('token'), 30);
      });

    const p1 = lock.runExclusive('c1', slow);
    const p2 = lock.runExclusive('c1', slow);
    const [a, b] = await Promise.all([p1, p2]);
    expect(a).toBe('token');
    expect(b).toBe('token');
    expect(calls).toBe(1);
  });
});

import { describe, expect, it } from 'vitest';
import { canEditResourceAcl, resolveEffectiveCanEdit } from './policy';

describe('canEditResourceAcl', () => {
  it('autorise CLIENT_ADMIN', () => {
    expect(canEditResourceAcl({ activeClientRole: 'CLIENT_ADMIN' })).toBe(true);
  });

  it.each(['CLIENT_USER', 'PLATFORM_ADMIN', 'GUEST', '', undefined])(
    'refuse %s',
    (role) => {
      expect(
        canEditResourceAcl({ activeClientRole: role as string | undefined }),
      ).toBe(false);
    },
  );
});

describe('resolveEffectiveCanEdit', () => {
  it('CLIENT_ADMIN sans override → true', () => {
    expect(
      resolveEffectiveCanEdit({ activeClientRole: 'CLIENT_ADMIN' }),
    ).toBe(true);
  });

  it('CLIENT_ADMIN + override=false → false (réducteur)', () => {
    expect(
      resolveEffectiveCanEdit({
        activeClientRole: 'CLIENT_ADMIN',
        override: false,
      }),
    ).toBe(false);
  });

  it('CLIENT_ADMIN + override=true → true', () => {
    expect(
      resolveEffectiveCanEdit({
        activeClientRole: 'CLIENT_ADMIN',
        override: true,
      }),
    ).toBe(true);
  });

  it('CLIENT_USER + override=true → false (override ne peut pas élargir)', () => {
    expect(
      resolveEffectiveCanEdit({
        activeClientRole: 'CLIENT_USER',
        override: true,
      }),
    ).toBe(false);
  });

  it('undefined role + override=true → false', () => {
    expect(
      resolveEffectiveCanEdit({
        activeClientRole: undefined,
        override: true,
      }),
    ).toBe(false);
  });

  it('undefined role sans override → false', () => {
    expect(
      resolveEffectiveCanEdit({ activeClientRole: undefined }),
    ).toBe(false);
  });
});

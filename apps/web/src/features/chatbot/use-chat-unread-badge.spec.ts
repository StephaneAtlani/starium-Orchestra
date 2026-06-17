import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useChatUnreadBadge } from './use-chat-unread-badge';

type Line = { role: 'USER' | 'ASSISTANT' };

describe('useChatUnreadBadge', () => {
  it('démarre à 0', () => {
    const { result } = renderHook(() => useChatUnreadBadge(false, []));
    expect(result.current).toBe(0);
  });

  it('incrémente quand une réponse assistant arrive drawer fermé', () => {
    const { result, rerender } = renderHook(
      ({ open, lines }: { open: boolean; lines: Line[] }) =>
        useChatUnreadBadge(open, lines),
      { initialProps: { open: false, lines: [] as Line[] } },
    );

    rerender({
      open: false,
      lines: [{ role: 'USER' }, { role: 'ASSISTANT' }],
    });

    expect(result.current).toBe(1);
  });

  it('n’incrémente pas si le drawer est ouvert', () => {
    const { result, rerender } = renderHook(
      ({ open, lines }: { open: boolean; lines: Line[] }) =>
        useChatUnreadBadge(open, lines),
      { initialProps: { open: true, lines: [] as Line[] } },
    );

    rerender({
      open: true,
      lines: [{ role: 'ASSISTANT' }],
    });

    expect(result.current).toBe(0);
  });

  it('n’incrémente pas sur un message utilisateur seul', () => {
    const { result, rerender } = renderHook(
      ({ open, lines }: { open: boolean; lines: Line[] }) =>
        useChatUnreadBadge(open, lines),
      { initialProps: { open: false, lines: [] as Line[] } },
    );

    rerender({ open: false, lines: [{ role: 'USER' }] });

    expect(result.current).toBe(0);
  });

  it('remet le compteur à 0 à l’ouverture du drawer', () => {
    const { result, rerender } = renderHook(
      ({ open, lines }: { open: boolean; lines: Line[] }) =>
        useChatUnreadBadge(open, lines),
      { initialProps: { open: false, lines: [{ role: 'ASSISTANT' }] } },
    );

    expect(result.current).toBe(1);

    rerender({ open: true, lines: [{ role: 'ASSISTANT' }] });

    expect(result.current).toBe(0);
  });

  it('cumule plusieurs réponses non lues', () => {
    const { result, rerender } = renderHook(
      ({ open, lines }: { open: boolean; lines: Line[] }) =>
        useChatUnreadBadge(open, lines),
      { initialProps: { open: false, lines: [] as Line[] } },
    );

    rerender({
      open: false,
      lines: [{ role: 'ASSISTANT' }],
    });
    rerender({
      open: false,
      lines: [{ role: 'ASSISTANT' }, { role: 'USER' }, { role: 'ASSISTANT' }],
    });

    expect(result.current).toBe(2);
  });
});

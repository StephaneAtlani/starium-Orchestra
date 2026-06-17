import React from 'react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import {
  Dialog,
  DialogBody,
  DialogContent,
} from '@/components/ui/dialog';

vi.mock('@/hooks/use-fullscreen-portal-container', () => ({
  useFullscreenPortalContainer: () => undefined,
}));

afterEach(() => {
  cleanup();
});

function getDialogContentClass(extra?: { sidePanel?: boolean; chatWidget?: boolean; size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'; className?: string }) {
  cleanup();
  const { sidePanel, chatWidget, size, className } = extra ?? {};
  render(
    <Dialog open>
      <DialogContent sidePanel={sidePanel} chatWidget={chatWidget} size={size} className={className}>
        <span>Contenu</span>
      </DialogContent>
    </Dialog>,
  );
  return document.querySelector('[data-slot="dialog-content"]')?.className ?? '';
}

describe('DialogContent', () => {
  it('modal — bottom-sheet mobile et conteneur flex overflow-hidden', () => {
    const cls = getDialogContentClass();
    expect(cls).toContain('bottom-0');
    expect(cls).toContain('rounded-t-2xl');
    expect(cls).toContain('max-h-[min(92dvh,calc(100dvh_-_1rem))]');
    expect(cls).toContain('flex');
    expect(cls).toContain('flex-col');
    expect(cls).toContain('overflow-x-hidden');
    expect(cls).toContain('overflow-y-hidden');
    expect(cls).toContain('sm:top-1/2');
    expect(cls).toContain('sm:w-[calc(100%_-_2rem)]');
    expect(cls).toContain('sm:max-h-[calc(100dvh_-_2rem)]');
    expect(cls).not.toContain('overflow-y-auto');
    expect(cls).not.toContain('overscroll-contain');
  });

  it('modal — size sm par défaut', () => {
    expect(getDialogContentClass()).toContain('sm:max-w-sm');
  });

  it('modal — tailles normalisées md, xl, full', () => {
    expect(getDialogContentClass({ size: 'md' })).toContain('sm:max-w-md');
    expect(getDialogContentClass({ size: 'xl' })).toContain('sm:max-w-4xl');
    expect(getDialogContentClass({ size: 'full' })).toContain('sm:max-w-[calc(100%_-_2rem)]');
  });

  it('modal — twMerge max-w : className surcharge size', () => {
    const cls = getDialogContentClass({ className: 'sm:max-w-4xl' });
    expect(cls).toContain('sm:max-w-4xl');
    expect(cls).not.toContain('sm:max-w-sm');
  });

  it('modal — twMerge overflow legacy : className surcharge overflow-y-hidden', () => {
    const cls = getDialogContentClass({ className: 'overflow-y-auto max-h-[90vh]' });
    expect(cls).toContain('overflow-y-auto');
    expect(cls).not.toContain('overflow-y-hidden');
  });

  it('sidePanel — inchangé, sans classes bottom-sheet modal', () => {
    const cls = getDialogContentClass({ sidePanel: true });
    expect(cls).toContain('inset-y-0');
    expect(cls).toContain('right-0');
    expect(cls).not.toContain('rounded-t-2xl');
    expect(cls).not.toMatch(/\bbottom-0\b/);
  });

  it('chatWidget — inchangé, sans classes bottom-sheet modal', () => {
    const cls = getDialogContentClass({ chatWidget: true });
    expect(cls).toContain('bottom-3');
    expect(cls).toContain('right-3');
    expect(cls).not.toContain('rounded-t-2xl');
    expect(cls).not.toContain('sm:top-1/2');
  });
});

describe('DialogBody', () => {
  it('porte le scroll unique de la modale', () => {
    render(<DialogBody data-testid="dialog-body">Corps</DialogBody>);
    const body = document.querySelector('[data-slot="dialog-body"]');
    expect(body?.className).toContain('flex-1');
    expect(body?.className).toContain('min-h-0');
    expect(body?.className).toContain('overflow-y-auto');
    expect(body?.className).toContain('overscroll-contain');
  });
});

import React from 'react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

vi.mock('@/hooks/use-fullscreen-portal-container', () => ({
  useFullscreenPortalContainer: () => undefined,
}));

afterEach(() => {
  cleanup();
});

function getDialogContentClass(extra?: {
  sidePanel?: boolean;
  chatWidget?: boolean;
  layout?: 'starium' | 'legacy';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}) {
  cleanup();
  const { sidePanel, chatWidget, layout, size, className } = extra ?? {};
  render(
    <Dialog open>
      <DialogContent
        sidePanel={sidePanel}
        chatWidget={chatWidget}
        layout={layout}
        size={size}
        className={className}
      >
        <span>Contenu</span>
      </DialogContent>
    </Dialog>,
  );
  return document.querySelector('[data-slot="dialog-content"]')?.className ?? '';
}

describe('DialogContent', () => {
  it('modal starium (défaut) — centré, fond card, overflow hidden', () => {
    const cls = getDialogContentClass();
    expect(cls).toContain('top-1/2');
    expect(cls).toContain('-translate-x-1/2');
    expect(cls).toContain('-translate-y-1/2');
    expect(cls).toContain('max-h-[calc(100%-2rem)]');
    expect(cls).toContain('bg-card');
    expect(cls).toContain('flex');
    expect(cls).toContain('flex-col');
    expect(cls).toContain('min-h-0');
    expect(cls).toContain('overflow-hidden');
    expect(cls).not.toContain('overflow-y-auto');
    expect(cls).not.toContain('bottom-0');
  });

  it('modal starium — size md par défaut (520px)', () => {
    expect(getDialogContentClass()).toContain('sm:max-w-[520px]');
  });

  it('modal starium — tailles normalisées', () => {
    expect(getDialogContentClass({ size: 'lg' })).toContain('sm:max-w-[560px]');
    expect(getDialogContentClass({ size: 'xl' })).toContain('sm:max-w-4xl');
    expect(getDialogContentClass({ size: 'full' })).toContain('sm:max-w-[calc(100%_-_2rem)]');
  });

  it('modal legacy — bottom-sheet mobile', () => {
    const cls = getDialogContentClass({ layout: 'legacy' });
    expect(cls).toContain('bottom-0');
    expect(cls).toContain('rounded-t-2xl');
    expect(cls).toContain('sm:top-1/2');
  });

  it('modal — twMerge max-w : className surcharge size', () => {
    const cls = getDialogContentClass({ className: 'sm:max-w-4xl' });
    expect(cls).toContain('sm:max-w-4xl');
    expect(cls).not.toContain('sm:max-w-[520px]');
  });

  it('modal — twMerge overflow legacy : className surcharge overflow-y-hidden', () => {
    const cls = getDialogContentClass({ className: 'overflow-y-auto max-h-[90vh]' });
    expect(cls).toContain('overflow-y-auto');
    expect(cls).not.toContain('overflow-y-hidden');
  });

  it('sidePanel — largeur mock 560px (35rem)', () => {
    const cls = getDialogContentClass({ sidePanel: true });
    expect(cls).toContain('inset-y-0');
    expect(cls).toContain('right-0');
    expect(cls).toContain('max-w-[min(100vw,35rem)]');
    expect(cls).not.toContain('rounded-t-2xl');
  });

  it('chatWidget — inchangé', () => {
    const cls = getDialogContentClass({ chatWidget: true });
    expect(cls).toContain('bottom-3');
    expect(cls).toContain('right-3');
    expect(cls).not.toContain('sm:top-1/2');
  });
});

describe('DialogBody', () => {
  it('layout starium — rail StariumScrollArea reveal=hover (norme macOS)', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogBody data-testid="dialog-body">Corps</DialogBody>
        </DialogContent>
      </Dialog>,
    );
    const body = document.querySelector('[data-slot="dialog-body"]');
    expect(body?.className).toContain('starium-modal__body');
    expect(body?.className).toContain('starium-modal__body--rail');
    expect(body?.className).toMatch(/overflow-hidden/);
    const scroll = body?.querySelector('[data-starium-scroll]');
    expect(scroll).toBeTruthy();
    expect(scroll).toHaveAttribute('data-reveal', 'hover');
    expect(scroll?.className).toMatch(/max-h-\[min\(70dvh,560px\)\]/);
    expect(body?.querySelector('[data-slot="starium-scroll-viewport"]')).toBeTruthy();
  });

  it('layout starium — overflow-hidden délègue le scroll aux enfants (pas de rail socle)', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogBody className="!overflow-hidden !p-0" data-testid="dialog-body">
            Corps
          </DialogBody>
        </DialogContent>
      </Dialog>,
    );
    const body = document.querySelector('[data-slot="dialog-body"]');
    expect(body?.className).toMatch(/overflow-hidden/);
    expect(body?.className).not.toContain('starium-modal__body--rail');
    expect(body?.querySelector('[data-starium-scroll]')).toBeNull();
  });

  it('layout starium — accent data attribute', () => {
    render(
      <Dialog open>
        <DialogContent modalAccent="violet">
          <DialogBody data-testid="dialog-body">Corps</DialogBody>
        </DialogContent>
      </Dialog>,
    );
    expect(document.querySelector('[data-slot="dialog-content"]')?.getAttribute('data-modal-accent')).toBe(
      'violet',
    );
  });
});

describe('DialogHeader', () => {
  it('injecte la croix de fermeture à droite du header (starium)', () => {
    render(
      <Dialog open>
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Titre</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );
    const close = document.querySelector('[data-slot="dialog-close"]');
    expect(close).toBeTruthy();
    expect(close?.className).toContain('starium-modal__close');
  });

  it('une seule croix avec header + corps + pied (starium)', () => {
    render(
      <Dialog open>
        <DialogContent showCloseButton hasStariumHeader>
          <DialogHeader>
            <DialogTitle>Titre</DialogTitle>
          </DialogHeader>
          <DialogBody>Corps</DialogBody>
          <DialogFooter>Pied</DialogFooter>
        </DialogContent>
      </Dialog>,
    );
    expect(document.querySelectorAll('[data-slot="dialog-close"]')).toHaveLength(1);
    expect(document.querySelector('[data-slot="dialog-close"]')?.className).not.toContain(
      'absolute',
    );
  });
});

describe('DialogFooter', () => {
  it('utilise le pied starium par défaut', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogFooter>Pied</DialogFooter>
        </DialogContent>
      </Dialog>,
    );
    const footer = document.querySelector('[data-slot="dialog-footer"]');
    expect(footer?.className).toContain('starium-modal__footer');
  });
});

describe('DialogContent auto-body', () => {
  it('enveloppe le contenu orphelin dans DialogBody (starium)', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Titre</DialogTitle>
          </DialogHeader>
          <p data-testid="orphan">Corps</p>
          <DialogFooter>Pied</DialogFooter>
        </DialogContent>
      </Dialog>,
    );
    const body = document.querySelector('[data-slot="dialog-body"]');
    expect(body).toBeTruthy();
    expect(body?.className).toContain('starium-modal__body');
    expect(body?.querySelector('[data-testid="orphan"]')).toBeTruthy();
  });

  it('header, status et corps restent des frères directs (pas de header dans le body)', () => {
    render(
      <Dialog open>
        <DialogContent showCloseButton hasStariumHeader>
          <DialogHeader>
            <DialogTitle>Titre</DialogTitle>
          </DialogHeader>
          <div data-slot="dialog-status" className="starium-modal__status">
            Statut
          </div>
          <DialogBody>Corps</DialogBody>
          <DialogFooter>Pied</DialogFooter>
        </DialogContent>
      </Dialog>,
    );
    const content = document.querySelector('[data-slot="dialog-content"]');
    const header = content?.querySelector('[data-slot="dialog-header"]');
    const body = content?.querySelector('[data-slot="dialog-body"]');
    const status = content?.querySelector('[data-slot="dialog-status"]');
    expect(header?.parentElement).toBe(content);
    expect(body?.parentElement).toBe(content);
    expect(status?.parentElement).toBe(content);
    expect(body?.contains(header ?? null)).toBe(false);
  });
});

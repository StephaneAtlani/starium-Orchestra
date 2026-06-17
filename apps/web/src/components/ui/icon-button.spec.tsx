import React from 'react';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Button, buttonVariants } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';

describe('Button icon variants', () => {
  it.each([
    ['icon', 'h-11', 'w-11', 'md:size-8'],
    ['icon-sm', 'h-11', 'w-11', 'md:size-7'],
    ['icon-xs', 'h-11', 'w-11', 'md:size-6'],
    ['icon-lg', 'h-11', 'w-11', 'md:size-9'],
  ] as const)('%s — cible 44px mobile, taille desktop md:', (size, h, w, mdSize) => {
    const cls = buttonVariants({ size, variant: 'ghost' });
    expect(cls).toContain(h);
    expect(cls).toContain(w);
    expect(cls).toContain(mdSize);
  });

  it('rend les classes icon sur le bouton', () => {
    render(<Button size="icon" variant="ghost" aria-label="Test" />);
    const btn = document.querySelector('[data-slot="button"]');
    expect(btn?.className).toContain('h-11');
    expect(btn?.className).toContain('md:size-8');
  });
});

describe('IconButton', () => {
  it('délègue à Button avec aria-label obligatoire', () => {
    render(
      <IconButton aria-label="Fermer">
        <span data-testid="icon-child">×</span>
      </IconButton>,
    );
    const btn = document.querySelector('[data-slot="button"]');
    expect(btn).toHaveAttribute('aria-label', 'Fermer');
    expect(btn?.className).toContain('h-11');
  });
});

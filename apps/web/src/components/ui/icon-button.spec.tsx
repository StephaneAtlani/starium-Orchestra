import React from 'react';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Button, buttonVariants } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';

describe('Button icon variants', () => {
  it.each([
    ['icon', 'size-11', 'md:size-[43px]'],
    ['icon-sm', 'size-11', 'md:size-9'],
    ['icon-xs', 'size-11', 'md:size-8'],
    ['icon-lg', 'size-11', 'md:size-[43px]'],
  ] as const)('%s — cible 44px mobile, taille desktop md:', (size, mobileSize, mdSize) => {
    const cls = buttonVariants({ size, variant: 'ghost' });
    expect(cls).toContain(mobileSize);
    expect(cls).toContain(mdSize);
  });

  it('rend les classes icon sur le bouton', () => {
    render(<Button size="icon" variant="ghost" aria-label="Test" />);
    const btn = document.querySelector('[data-slot="button"]');
    expect(btn?.className).toContain('size-11');
    expect(btn?.className).toContain('md:size-[43px]');
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
    expect(btn?.className).toContain('size-11');
  });
});

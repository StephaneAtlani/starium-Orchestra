import React from 'react';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { PageHeader } from '@/components/layout/page-header';

describe('PageHeader', () => {
  it('h1 en text-xl mobile et text-2xl desktop (DS §12)', () => {
    render(<PageHeader title="Budgets" />);
    const h1 = document.querySelector('h1');
    expect(h1?.className).toContain('text-xl');
    expect(h1?.className).toContain('text-2xl');
    expect(h1?.className).not.toContain('text-3xl');
  });

  it('rend carte blanche, eyebrow et actions', () => {
    render(
      <PageHeader
        eyebrow="Pilotage › Projets"
        title="Projets"
        actions={<button type="button">Action</button>}
      />,
    );
    expect(document.querySelector('.starium-page-header')?.className).toContain(
      'starium-page-header',
    );
    expect(document.querySelector('.starium-page-header__eyebrow')).toHaveTextContent(
      'Pilotage › Projets',
    );
    expect(document.querySelector('.starium-page-header__actions')).toBeTruthy();
  });
});

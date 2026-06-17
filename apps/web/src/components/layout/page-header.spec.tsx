import React from 'react';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { PageHeader } from '@/components/layout/page-header';

describe('PageHeader', () => {
  it('h1 en text-2xl strict (DS §12)', () => {
    render(<PageHeader title="Budgets" />);
    const h1 = document.querySelector('h1');
    expect(h1?.className).toContain('text-2xl');
    expect(h1?.className).not.toContain('text-3xl');
    expect(h1?.className).not.toContain('sm:text-3xl');
  });
});

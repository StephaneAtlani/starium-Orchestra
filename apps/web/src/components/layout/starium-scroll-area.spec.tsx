import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StariumScrollArea } from './starium-scroll-area';

describe('StariumScrollArea', () => {
  it('affiche le rail au survol quand le contenu déborde', () => {
    const { container } = render(
      <div style={{ height: 120, width: 240 }}>
        <StariumScrollArea className="h-full w-full" reveal="hover">
          <div style={{ height: 400 }} data-testid="tall">
            Contenu long
          </div>
        </StariumScrollArea>
      </div>,
    );

    const root = container.querySelector('[data-starium-scroll]');
    expect(root).toBeTruthy();

    // Force overflow measure (jsdom often reports 0 heights).
    const viewport = container.querySelector(
      '.starium-scroll-area__viewport',
    ) as HTMLDivElement;
    Object.defineProperty(viewport, 'clientHeight', {
      configurable: true,
      value: 120,
    });
    Object.defineProperty(viewport, 'scrollHeight', {
      configurable: true,
      value: 400,
    });
    fireEvent.scroll(viewport);

    fireEvent.mouseEnter(root!);
    const rail = container.querySelector('.starium-scroll-area__rail-track');
    expect(rail).toBeTruthy();
    expect(rail?.className).toMatch(/opacity-100/);
    expect(root).toHaveAttribute('data-scroll-hover', 'true');

    fireEvent.mouseLeave(root!);
    expect(rail?.className).toMatch(/opacity-0/);
  });

  it('n’affiche aucun rail en reveal=never même au survol', () => {
    const { container } = render(
      <div style={{ height: 120, width: 240 }}>
        <StariumScrollArea className="h-full w-full" reveal="never">
          <div style={{ height: 400 }}>Contenu long</div>
        </StariumScrollArea>
      </div>,
    );

    const root = container.querySelector('[data-starium-scroll]');
    const viewport = container.querySelector(
      '.starium-scroll-area__viewport',
    ) as HTMLDivElement;
    Object.defineProperty(viewport, 'clientHeight', {
      configurable: true,
      value: 120,
    });
    Object.defineProperty(viewport, 'scrollHeight', {
      configurable: true,
      value: 400,
    });
    fireEvent.scroll(viewport);
    fireEvent.mouseEnter(root!);

    expect(container.querySelector('.starium-scroll-area__rail-track')).toBeNull();
    expect(root).toHaveAttribute('data-reveal', 'never');
    expect(root).not.toHaveAttribute('data-scroll-hover');
  });

  it('expose un libellé accessible via children', () => {
    render(
      <StariumScrollArea className="h-40">
        <p>Zone scrollable</p>
      </StariumScrollArea>,
    );
    expect(screen.getByText('Zone scrollable')).toBeInTheDocument();
  });

  it('layout auto : fill si h-* explicite, flow sinon', () => {
    const { container: fillContainer } = render(
      <StariumScrollArea className="h-full w-full">
        <p>Fill</p>
      </StariumScrollArea>,
    );
    expect(
      fillContainer.querySelector('[data-starium-scroll]')?.getAttribute(
        'data-scroll-layout',
      ),
    ).toBe('fill');
    expect(
      fillContainer.querySelector('.starium-scroll-area__viewport')?.className,
    ).toMatch(/absolute/);

    const { container: flowContainer } = render(
      <StariumScrollArea className="w-full">
        <p>Flow</p>
      </StariumScrollArea>,
    );
    expect(
      flowContainer.querySelector('[data-starium-scroll]')?.getAttribute(
        'data-scroll-layout',
      ),
    ).toBe('flow');
    expect(
      flowContainer.querySelector('.starium-scroll-area__viewport')?.className,
    ).toMatch(/relative/);
  });
});

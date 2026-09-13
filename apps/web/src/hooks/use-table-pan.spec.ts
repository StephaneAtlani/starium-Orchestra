import { describe, expect, it } from 'vitest';
import {
  findScrollableAncestor,
  isScrollableAxis,
} from './use-table-pan';

describe('use-table-pan scroll helpers', () => {
  it('détecte un overflow-x auto avec contenu plus large', () => {
    const el = document.createElement('div');
    Object.defineProperty(el, 'scrollWidth', { value: 1200 });
    Object.defineProperty(el, 'clientWidth', { value: 800 });
    el.style.overflowX = 'auto';
    el.style.overflowY = 'visible';
    document.body.appendChild(el);
    expect(isScrollableAxis(el, 'x')).toBe(true);
    expect(isScrollableAxis(el, 'y')).toBe(false);
    el.remove();
  });

  it('remonte jusqu’au main pour le scroll vertical page', () => {
    const main = document.createElement('main');
    main.style.overflowY = 'auto';
    Object.defineProperty(main, 'scrollHeight', { value: 2000 });
    Object.defineProperty(main, 'clientHeight', { value: 800 });

    const wrap = document.createElement('div');
    wrap.style.overflowX = 'auto';
    wrap.style.overflowY = 'visible';
    Object.defineProperty(wrap, 'scrollWidth', { value: 800 });
    Object.defineProperty(wrap, 'clientWidth', { value: 800 });
    Object.defineProperty(wrap, 'scrollHeight', { value: 800 });
    Object.defineProperty(wrap, 'clientHeight', { value: 800 });

    main.appendChild(wrap);
    document.body.appendChild(main);

    expect(isScrollableAxis(wrap, 'y')).toBe(false);
    expect(findScrollableAncestor(wrap.parentElement, 'y')).toBe(main);

    main.remove();
  });
});

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { OverflowTabsMoreMenu } from './overflow-tabs-more-menu';

describe('OverflowTabsMoreMenu', () => {
  it('rend le bouton burger accessible', () => {
    const html = renderToStaticMarkup(
      <OverflowTabsMoreMenu
        items={[
          { id: 'history', label: 'Historique', onSelect: () => undefined },
          { id: 'options', label: 'Options', onSelect: () => undefined },
        ]}
        activeOverflowId="history"
      />,
    );
    expect(html).toContain('Menu des onglets, actif : Historique');
    expect(html).toContain('aria-haspopup="menu"');
  });
});

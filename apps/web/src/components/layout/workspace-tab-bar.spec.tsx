import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LayoutGrid } from 'lucide-react';
import { WorkspaceTabBar } from './workspace-tab-bar';

describe('WorkspaceTabBar', () => {
  it('rend le bandeau desktop et le sélecteur mobile avec icônes', () => {
    const html = renderToStaticMarkup(
      <WorkspaceTabBar
        items={[
          { id: 'overview', label: "Vue d'ensemble", icon: LayoutGrid },
          { id: 'history', label: 'Historique', icon: LayoutGrid },
        ]}
        activeId="overview"
        onSelect={() => undefined}
        ariaLabel="Sections test"
        selectId="test-tab-select"
      />,
    );

    expect(html).toContain('starium-project-workspace-tabs');
    expect(html).toContain('starium-project-workspace-tabs-mobile');
    expect(html).toContain('Vue d&#x27;ensemble');
    expect(html).toContain('Historique');
    expect(html).toContain('role="tablist"');
  });
});

import { describe, expect, it } from 'vitest';
import { strategicDirectionStrategyKeys } from './strategic-direction-strategy-query-keys';

describe('strategicDirectionStrategyKeys', () => {
  it('scope les clés par client', () => {
    expect(strategicDirectionStrategyKeys.root('c1')).toEqual([
      'strategic-direction-strategies',
      'c1',
    ]);
    expect(strategicDirectionStrategyKeys.root('c1')).not.toEqual(
      strategicDirectionStrategyKeys.root('c2'),
    );
  });

  it('compose la clé liste avec filtres métier', () => {
    expect(
      strategicDirectionStrategyKeys.list('c1', {
        directionId: 'd1',
        alignedVisionId: 'v1',
        status: 'DRAFT',
        search: 'data',
      }),
    ).toEqual([
      'strategic-direction-strategies',
      'c1',
      'list',
      'v3',
      'd1',
      'v1',
      'DRAFT',
      'data',
      false,
    ]);
  });

  it('compose la clé links par stratégie', () => {
    expect(strategicDirectionStrategyKeys.links('c1', 's1')).toEqual([
      'strategic-direction-strategies',
      'c1',
      'links',
      's1',
    ]);
    expect(strategicDirectionStrategyKeys.links('c1', null)).toEqual([
      'strategic-direction-strategies',
      'c1',
      'links',
      null,
    ]);
  });

  it('compose portfolio / schema-metrics / consolidation', () => {
    expect(
      strategicDirectionStrategyKeys.portfolio('c1', {
        alignedVisionId: 'v1',
        search: 'dsi',
      }),
    ).toEqual(['strategic-direction-strategies', 'c1', 'portfolio', 'v1', 'dsi']);
    expect(strategicDirectionStrategyKeys.schemaMetrics('c1', 's1')).toEqual([
      'strategic-direction-strategies',
      'c1',
      'schema-metrics',
      's1',
    ]);
    expect(strategicDirectionStrategyKeys.consolidation('c1', 'v1')).toEqual([
      'strategic-direction-strategies',
      'c1',
      'consolidation',
      'v1',
    ]);
    expect(strategicDirectionStrategyKeys.consolidation('c1')).toEqual([
      'strategic-direction-strategies',
      'c1',
      'consolidation',
      null,
    ]);
  });
});

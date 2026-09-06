import { describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import {
  buildAddManualLinkBody,
  buildAddProjectLinkBody,
} from './strategic-link-payload';
import { invalidateStrategicAlignmentQueries } from '../api/strategic-vision.mutations';
import { strategicVisionKeys } from './strategic-vision-query-keys';

describe('buildAddProjectLinkBody', () => {
  it('envoie linkType PROJECT avec targetId interne et libellé métier', () => {
    const body = buildAddProjectLinkBody({
      id: 'proj-cuid-secret',
      label: 'Migration ERP',
    });
    expect(body).toEqual({
      linkType: 'PROJECT',
      targetId: 'proj-cuid-secret',
      targetLabelSnapshot: 'Migration ERP',
    });
    expect(body.targetLabelSnapshot).not.toBe(body.targetId);
  });
});

describe('buildAddManualLinkBody', () => {
  it('envoie un libellé manuel trimé', () => {
    expect(buildAddManualLinkBody('  Initiative ad hoc  ')).toEqual({
      linkType: 'MANUAL',
      targetLabelSnapshot: 'Initiative ad hoc',
    });
  });
});

describe('invalidateStrategicAlignmentQueries', () => {
  it('invalide objectives, kpis, kpisByDirection et alerts', async () => {
    const queryClient = new QueryClient();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    await invalidateStrategicAlignmentQueries(queryClient, 'client-a');
    const keys = spy.mock.calls.map((call) => call[0]?.queryKey);
    expect(keys).toContainEqual(strategicVisionKeys.objectives('client-a'));
    expect(keys).toContainEqual(strategicVisionKeys.kpis('client-a'));
    expect(keys).toContainEqual(strategicVisionKeys.kpisByDirection('client-a'));
    expect(keys).toContainEqual(strategicVisionKeys.alertsBase('client-a'));
  });
});

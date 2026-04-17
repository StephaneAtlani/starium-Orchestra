import { describe, expect, it } from 'vitest';
import { deriveScenariosScreenState } from '../components/project-scenarios-view';
import { deriveProjectWorkspaceTabState } from '../components/project-workspace-tabs';

describe('Scenarios navigation and screen states', () => {
  it('active le tab Scénarios sur la route dédiée', () => {
    const state = deriveProjectWorkspaceTabState('/projects/p1/scenarios', null);
    expect(state.isScenarios).toBe(true);
    expect(state.isSynth).toBe(false);
  });

  it('active le tab Scénarios sur la route cockpit (sous-route scénarios)', () => {
    const state = deriveProjectWorkspaceTabState('/projects/p1/scenarios/cockpit', null);
    expect(state.isScenarios).toBe(true);
  });

  it('calcule loading/error/empty/success pour ProjectScenariosView', () => {
    expect(deriveScenariosScreenState({ isLoading: true, isError: false, totalItems: 0 })).toBe(
      'loading',
    );
    expect(deriveScenariosScreenState({ isLoading: false, isError: true, totalItems: 0 })).toBe(
      'error',
    );
    expect(deriveScenariosScreenState({ isLoading: false, isError: false, totalItems: 0 })).toBe(
      'empty',
    );
    expect(deriveScenariosScreenState({ isLoading: false, isError: false, totalItems: 2 })).toBe(
      'success',
    );
  });
});

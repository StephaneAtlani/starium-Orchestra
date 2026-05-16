import { ACCESS_ENFORCED_HANDLERS } from './access-intent-enforced-handlers';
import {
  buildHandlerKey,
  evaluateAccessIntentRbac,
  inferIntentFromLegacyPermission,
  isRouteServiceEnforced,
  legacyPermissionForIntent,
} from './access-intent.registry';

describe('access-intent.registry', () => {
  describe('isRouteServiceEnforced', () => {
    it('accepte ProjectsController.list + read', () => {
      expect(
        isRouteServiceEnforced(ACCESS_ENFORCED_HANDLERS.ProjectsController.list, 'read'),
      ).toBe(true);
    });

    it('refuse handler non enregistré', () => {
      expect(
        isRouteServiceEnforced('ProjectsController.portfolioSummary', 'read'),
      ).toBe(false);
    });
  });

  describe('buildHandlerKey', () => {
    it('forme Controller.method', () => {
      expect(buildHandlerKey('ProjectsController', 'list')).toBe(
        'ProjectsController.list',
      );
    });
  });

  describe('evaluateAccessIntentRbac', () => {
    it('read_scope + v2 + serviceEnforced → OK', () => {
      const r = evaluateAccessIntentRbac(
        'projects',
        'read',
        new Set(['projects.read_scope']),
        { v2Enabled: true, serviceEnforced: true },
      );
      expect(r.allowed).toBe(true);
      expect(r.orgScopeRequired).toBe(true);
    });

    it('read_scope + v2 sans serviceEnforced → refus', () => {
      const r = evaluateAccessIntentRbac(
        'projects',
        'read',
        new Set(['projects.read_scope']),
        { v2Enabled: true, serviceEnforced: false },
      );
      expect(r.allowed).toBe(false);
    });

    it('read_scope + v2 off → refus', () => {
      const r = evaluateAccessIntentRbac(
        'projects',
        'read',
        new Set(['projects.read_scope']),
        { v2Enabled: false, serviceEnforced: true },
      );
      expect(r.allowed).toBe(false);
    });

    it('read_all + v2 off → OK', () => {
      const r = evaluateAccessIntentRbac(
        'budgets',
        'read',
        new Set(['budgets.read_all']),
        { v2Enabled: false, serviceEnforced: false },
      );
      expect(r.allowed).toBe(true);
    });

    it('write_scope + v2 + serviceEnforced → OK', () => {
      const r = evaluateAccessIntentRbac(
        'projects',
        'write',
        new Set(['projects.write_scope']),
        { v2Enabled: true, serviceEnforced: true },
      );
      expect(r.allowed).toBe(true);
    });

    it('write_scope sur create → legacy refuse (intent create)', () => {
      const r = evaluateAccessIntentRbac(
        'projects',
        'create',
        new Set(['projects.write_scope']),
        { v2Enabled: true, serviceEnforced: true },
      );
      expect(r.allowed).toBe(false);
    });

    it('projects.create legacy → OK', () => {
      const r = evaluateAccessIntentRbac(
        'projects',
        'create',
        new Set(['projects.create']),
        { v2Enabled: false, serviceEnforced: false },
      );
      expect(r.allowed).toBe(true);
    });
  });

  describe('inferIntentFromLegacyPermission', () => {
    it('mappe projects.read', () => {
      expect(inferIntentFromLegacyPermission('projects.read')).toEqual({
        module: 'projects',
        intent: 'read',
      });
    });
  });

  describe('legacyPermissionForIntent', () => {
    it('read → *.read', () => {
      expect(legacyPermissionForIntent('budgets', 'read')).toBe('budgets.read');
    });
  });
});

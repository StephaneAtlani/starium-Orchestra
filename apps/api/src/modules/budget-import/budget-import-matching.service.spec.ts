import { BudgetImportMatchingService } from './budget-import-matching.service';
import type { MappingConfig, BudgetImportOptionsConfig } from './types/mapping.types';

describe('BudgetImportMatchingService', () => {
  let service: BudgetImportMatchingService;

  beforeEach(() => {
    service = new BudgetImportMatchingService();
  });

  describe('normalizeRow', () => {
    it('extracts externalId from mapped column', () => {
      const mapping: MappingConfig = {
        fields: { externalId: 'ID', name: 'Libelle', amount: 'Montant' },
        matching: { strategy: 'EXTERNAL_ID' },
      };
      const row = { ID: '  ext-123  ', Libelle: 'Test', Montant: '1000' };
      const options: BudgetImportOptionsConfig = { trimValues: true };
      const result = service.normalizeRow(row, mapping, options);
      expect(result.externalId).toBe('ext-123');
      expect(result.values['name']).toBe('Test');
      expect(result.values['amount']).toBe(1000);
    });

    it('computes compositeHash when strategy is COMPOSITE', () => {
      const mapping: MappingConfig = {
        fields: { date: 'Date', amount: 'Montant', supplier: 'Fournisseur' },
        matching: { strategy: 'COMPOSITE', keys: ['date', 'amount', 'supplier'] },
      };
      const row = { Date: '2026-01-01', Montant: '1200', Fournisseur: 'AWS' };
      const result = service.normalizeRow(row, mapping, { trimValues: true });
      expect(result.compositeHash).toBeTruthy();
      expect(typeof result.compositeHash).toBe('string');
      expect(result.compositeHash!.length).toBe(64);
    });
  });

  describe('findExistingLink', () => {
    it('returns link when externalId matches', () => {
      const maps = service.buildRowLinkMaps([
        { externalId: 'e1', compositeHash: null, targetEntityId: 'line-1' },
      ]);
      const found = service.findExistingLink('e1', null, maps);
      expect(found?.targetEntityId).toBe('line-1');
    });

    it('returns null when no match', () => {
      const maps = service.buildRowLinkMaps([]);
      expect(service.findExistingLink('unknown', null, maps)).toBeNull();
      expect(service.findExistingLink(null, 'somehash', maps)).toBeNull();
    });
  });

  describe('hashComposite', () => {
    it('returns deterministic hex string', () => {
      const h1 = service.hashComposite('a|b|c');
      const h2 = service.hashComposite('a|b|c');
      expect(h1).toBe(h2);
      expect(h1).toMatch(/^[a-f0-9]{64}$/);
    });
  });
});

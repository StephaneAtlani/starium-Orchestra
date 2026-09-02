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

    it('parses committedAmount and consumedAmount as decimals', () => {
      const mapping: MappingConfig = {
        fields: {
          amount: 'Montant',
          committedAmount: 'Engagé',
          consumedAmount: 'Consommé',
        },
        matching: { strategy: 'EXTERNAL_ID' },
      };
      const row = { Montant: '1000', Engagé: '200,50', Consommé: '150,25' };
      const result = service.normalizeRow(row, mapping, {
        trimValues: true,
        decimalSeparator: ',',
      });
      expect(result.values['amount']).toBe(1000);
      expect(result.values['committedAmount']).toBe(200.5);
      expect(result.values['consumedAmount']).toBe(150.25);
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

    it('routes shared amount to committedAmount for CD and consumedAmount for FA', () => {
      const mapping: MappingConfig = {
        fields: {
          name: 'Libelle',
          amount: 'Montant',
          committedAmount: 'Montant',
          consumedAmount: 'Montant',
        },
        documentKindFilter: {
          column: 'Piece',
          orderPrefix: 'CD',
          invoicePrefix: 'FA',
          amountColumn: 'Montant',
        },
      };
      const orderRow = service.normalizeRow(
        { Piece: 'CD  0000188999', Libelle: 'L1', Montant: '1000' },
        mapping,
        { trimValues: true },
      );
      expect(orderRow.values.documentKind).toBe('ORDER');
      expect(orderRow.values.documentRef).toBe('CD 0000188999');
      expect(orderRow.values.committedAmount).toBe(1000);
      expect(orderRow.values.consumedAmount).toBeNull();

      const invoiceRow = service.normalizeRow(
        { Piece: 'FA  0000302487', Libelle: 'L2', Montant: '250,5' },
        mapping,
        { trimValues: true, decimalSeparator: ',' },
      );
      expect(invoiceRow.values.documentKind).toBe('INVOICE');
      expect(invoiceRow.values.consumedAmount).toBe(250.5);
      expect(invoiceRow.values.committedAmount).toBeNull();
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

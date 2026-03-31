import { BudgetImportParserService } from './budget-import-parser.service';

describe('BudgetImportParserService', () => {
  let service: BudgetImportParserService;

  beforeEach(() => {
    service = new BudgetImportParserService();
  });

  describe('parse CSV', () => {
    it('parses CSV with comma delimiter', () => {
      const buffer = Buffer.from(
        'Date,Montant,Fournisseur\n2026-01-01,1000,AWS\n2026-01-02,2000,GCP',
        'utf-8',
      );
      const result = service.parse(buffer, 'CSV', { maxRows: 10 });
      expect(result.columns).toEqual(['Date', 'Montant', 'Fournisseur']);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual({
        Date: '2026-01-01',
        Montant: '1000',
        Fournisseur: 'AWS',
      });
    });

    it('parses CSV with semicolon delimiter', () => {
      const buffer = Buffer.from(
        'Date;Montant;Libelle\n01/01/2026;1500,50;Service',
        'utf-8',
      );
      const result = service.parse(buffer, 'CSV', {
        maxRows: 10,
        csvDelimiter: ';',
      });
      expect(result.columns).toEqual(['Date', 'Montant', 'Libelle']);
      expect(result.rows[0].Montant).toBe('1500,50');
    });
  });

  describe('analyze', () => {
    it('returns columns, sample rows and row count for CSV', () => {
      const buffer = Buffer.from(
        'A,B,C\n1,2,3\n4,5,6\n7,8,9',
        'utf-8',
      );
      const result = service.analyze(buffer, 'CSV', { sampleLimit: 2 });
      expect(result.columns).toEqual(['A', 'B', 'C']);
      expect(result.sampleRows).toHaveLength(2);
      expect(result.rowCount).toBe(3);
      expect(result.activeSheetName).toBeUndefined();
    });
  });
});

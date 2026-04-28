import {
  getRiskDefaultDomainDefinitions,
  isRiskDomainVisibleInV1Catalog,
  RISK_V1_VISIBLE_DOMAIN_CODES,
  legacyImpactToTypeCode,
} from './risk-taxonomy-defaults';

describe('risk-taxonomy-defaults', () => {
  it('mappe les impacts legacy vers les types OTHER_* V1', () => {
    expect(legacyImpactToTypeCode('FINANCIAL')).toEqual({
      domainCode: 'FINANCE',
      typeCode: 'OTHER_FINANCIAL_RISK',
    });
    expect(legacyImpactToTypeCode('OPERATIONAL')).toEqual({
      domainCode: 'OPERATIONS',
      typeCode: 'OTHER_OPERATIONAL_RISK',
    });
    expect(legacyImpactToTypeCode('LEGAL')).toEqual({
      domainCode: 'LEGAL_COMPLIANCE',
      typeCode: 'OTHER_LEGAL_COMPLIANCE_RISK',
    });
    expect(legacyImpactToTypeCode('REPUTATION')).toEqual({
      domainCode: 'REPUTATION',
      typeCode: 'OTHER_REPUTATION_RISK',
    });
    expect(legacyImpactToTypeCode(null)).toEqual({
      domainCode: 'GENERAL',
      typeCode: 'UNCLASSIFIED',
    });
  });

  it('filtre les domaines non V1 dans le catalogue par défaut', () => {
    expect(isRiskDomainVisibleInV1Catalog('GENERAL')).toBe(true);
    expect(isRiskDomainVisibleInV1Catalog('LEGAL_COMPLIANCE')).toBe(true);
    expect(isRiskDomainVisibleInV1Catalog('SUPPLIERS')).toBe(true);
    expect(isRiskDomainVisibleInV1Catalog('LEGAL')).toBe(false);
    expect(isRiskDomainVisibleInV1Catalog('THIRD_PARTY')).toBe(false);
    expect(isRiskDomainVisibleInV1Catalog('ECONOMIC')).toBe(false);
  });

  it('garantit au moins 12 types et un OTHER_* pour chaque domaine V1', () => {
    const defs = getRiskDefaultDomainDefinitions();
    for (const code of RISK_V1_VISIBLE_DOMAIN_CODES) {
      const domain = defs.find((d) => d.code === code);
      expect(domain).toBeDefined();
      expect(domain!.types.length).toBeGreaterThanOrEqual(12);
      expect(domain!.types.some((t) => /^OTHER_.*_RISK$/.test(t.code))).toBe(true);
    }
  });
});

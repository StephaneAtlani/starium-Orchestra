import { classifyDocumentKind } from './document-kind-filter';

describe('classifyDocumentKind', () => {
  it('détecte CD et FA avec espaces', () => {
    expect(classifyDocumentKind('CD  0000188999')).toBe('ORDER');
    expect(classifyDocumentKind('FA  0000302487')).toBe('INVOICE');
  });

  it('est insensible à la casse', () => {
    expect(classifyDocumentKind('cd 1')).toBe('ORDER');
    expect(classifyDocumentKind('fa-9')).toBe('INVOICE');
  });

  it('retourne null si préfixe inconnu', () => {
    expect(classifyDocumentKind('XX 123')).toBeNull();
    expect(classifyDocumentKind('')).toBeNull();
  });

  it('accepte des préfixes personnalisés', () => {
    expect(classifyDocumentKind('CMD 1', 'CMD', 'FAC')).toBe('ORDER');
    expect(classifyDocumentKind('FAC 2', 'CMD', 'FAC')).toBe('INVOICE');
  });
});

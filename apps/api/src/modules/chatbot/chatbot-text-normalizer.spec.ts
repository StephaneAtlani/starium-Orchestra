import {
  normalizeAndTokenize,
  normalizeForMatch,
  stripAccents,
} from './chatbot-text-normalizer';

describe('chatbot-text-normalizer', () => {
  it('stripAccents supprime les accents', () => {
    expect(stripAccents('Élément')).toBe('Element');
  });

  it('normalizeForMatch lowercases et accents', () => {
    expect(normalizeForMatch('  Café CRÈME  ')).toBe('cafe creme');
  });

  it('tokenize filtre les tokens courts', () => {
    const { tokens } = normalizeAndTokenize('a bc def');
    expect(tokens.has('bc')).toBe(true);
    expect(tokens.has('def')).toBe(true);
    expect(tokens.has('a')).toBe(false);
  });
});

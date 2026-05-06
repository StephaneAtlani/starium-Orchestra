import { describe, expect, it } from 'vitest';
import {
  parseMenuKey,
  STRATEGIC_VISION_HISTORY_PLACEHOLDER_MESSAGE,
} from './strategic-vision-tabs';

describe('strategic-vision-tabs config', () => {
  it('accepte tous les onglets RFC V1', () => {
    expect(parseMenuKey('overview')).toBe('overview');
    expect(parseMenuKey('enterprise')).toBe('enterprise');
    expect(parseMenuKey('axes')).toBe('axes');
    expect(parseMenuKey('objectives')).toBe('objectives');
    expect(parseMenuKey('alignment')).toBe('alignment');
    expect(parseMenuKey('alerts')).toBe('alerts');
    expect(parseMenuKey('history')).toBe('history');
  });

  it('rejette les onglets inconnus', () => {
    expect(parseMenuKey('legacy')).toBeNull();
    expect(parseMenuKey(null)).toBeNull();
  });

  it('définit un message placeholder historique explicite', () => {
    expect(STRATEGIC_VISION_HISTORY_PLACEHOLDER_MESSAGE.toLowerCase()).toContain('v1');
    expect(STRATEGIC_VISION_HISTORY_PLACEHOLDER_MESSAGE.toLowerCase()).toContain('backend');
  });
});

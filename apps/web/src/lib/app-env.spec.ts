import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getAppEnv,
  isPreproductionEnv,
  isPreproductionHost,
  parseNodeEnvFromDotenv,
  readNodeEnv,
} from './app-env';

describe('app-env', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('détecte preproduction via NODE_ENV', () => {
    vi.stubEnv('NODE_ENV', 'preproduction');
    expect(readNodeEnv()).toBe('preproduction');
    expect(getAppEnv()).toBe('preproduction');
    expect(isPreproductionEnv()).toBe(true);
  });

  it('accepte l’alias preprod', () => {
    vi.stubEnv('NODE_ENV', 'preprod');
    expect(isPreproductionEnv()).toBe(true);
  });

  it('reste production par défaut', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(getAppEnv()).toBe('production');
    expect(isPreproductionEnv()).toBe(false);
  });

  it('détecte preproduction via STARIUM_NODE_ENV (next dev)', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('STARIUM_NODE_ENV', 'preproduction');
    expect(isPreproductionEnv()).toBe(true);
  });

  it('parse NODE_ENV depuis un dotenv', () => {
    expect(parseNodeEnvFromDotenv('NODE_ENV=preproduction\n')).toBe(
      'preproduction',
    );
    expect(parseNodeEnvFromDotenv('# NODE_ENV=preproduction\nNODE_ENV=development\n')).toBe(
      'development',
    );
    expect(parseNodeEnvFromDotenv('FOO=bar\n')).toBeNull();
  });

  it('détecte un host préprod', () => {
    expect(isPreproductionHost('preprod.starium.xyz')).toBe(true);
    expect(isPreproductionHost('api-preprod.starium.xyz')).toBe(true);
    expect(isPreproductionHost('app.starium.xyz')).toBe(false);
  });
});

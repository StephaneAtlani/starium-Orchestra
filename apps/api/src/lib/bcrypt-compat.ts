import bcryptjs from 'bcryptjs';
import { promisify } from 'node:util';

/** Même surface async que `bcrypt` natif, via `bcryptjs` (pas de binaire native / pas de chaîne tar vulnérable). */
const hashP = promisify(bcryptjs.hash) as (
  data: string,
  saltOrRounds: string | number,
) => Promise<string>;
const compareP = promisify(bcryptjs.compare) as (
  data: string,
  encrypted: string,
) => Promise<boolean>;

async function hash(data: string, saltOrRounds: number): Promise<string> {
  return hashP(data, saltOrRounds);
}

async function compare(data: string, encrypted: string): Promise<boolean> {
  return compareP(data, encrypted);
}

export default { hash, compare };

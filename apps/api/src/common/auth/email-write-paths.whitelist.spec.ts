import { readFileSync } from 'fs';
import { join } from 'path';
import { EMAIL_WRITE_PATH_WHITELIST } from './email-write-paths.whitelist';

const API_ROOT = join(__dirname, '../../..');

describe('email-write-paths whitelist (T63)', () => {
  it.each(EMAIL_WRITE_PATH_WHITELIST)('%s injecte EmailReservationService', (relativePath) => {
    const absolute = join(API_ROOT, relativePath);
    const source = readFileSync(absolute, 'utf8');
    expect(source).toMatch(/EmailReservationService/);
    expect(source).toMatch(/emailReservation/);
  });
});

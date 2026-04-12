import { formatAwsSdkErrorDetail } from './procurement-s3-error.util';

describe('formatAwsSdkErrorDetail', () => {
  it('agrège metadata et cause', () => {
    const err = new Error('socket hang up');
    const wrapped = Object.assign(new Error('UnknownError'), {
      name: 'UnknownError',
      $metadata: { httpStatusCode: 403, requestId: 'REQ-1' },
      cause: err,
    });
    const s = formatAwsSdkErrorDetail(wrapped);
    expect(s).toContain('HTTP 403');
    expect(s).toContain('REQ-1');
    expect(s).toContain('socket hang up');
  });

  it('remplace UnknownError seul par un message guide', () => {
    const e = { name: 'UnknownError', message: 'UnknownError' };
    const s = formatAwsSdkErrorDetail(e);
    expect(s).toContain('IAM');
  });

  it('retire Unknown / UnknownError quand HTTP et RequestId sont présents', () => {
    const e = {
      name: 'Unknown',
      message: 'UnknownError',
      $metadata: { httpStatusCode: 403, requestId: 'ABC' },
    };
    const s = formatAwsSdkErrorDetail(e);
    expect(s).toContain('HTTP 403');
    expect(s).not.toContain('Unknown —');
    expect(s).not.toMatch(/^UnknownError — UnknownError/);
  });
});

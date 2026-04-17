import {
  buildClientDocumentsBucketName,
  sanitizeS3BucketNameFragment,
} from './client-documents-bucket-name.util';

describe('client-documents-bucket-name.util', () => {
  it('sanitize remplace _ par - et retire les caractères invalides', () => {
    expect(sanitizeS3BucketNameFragment('starium-dev_', 63)).toBe('starium-dev');
    expect(sanitizeS3BucketNameFragment('Foo_Bar!!!', 20)).toBe('foo-bar');
    expect(sanitizeS3BucketNameFragment('!!!', 20)).toBe('');
  });

  it('combine préfixe type UI + slug (ex. ticket utilisateur)', () => {
    expect(
      buildClientDocumentsBucketName({
        prefix: 'starium-dev_',
        clientId: 'cl_longidignoredifslug',
        slug: 'acme-test',
      }),
    ).toBe('starium-dev-acme-test');
  });

  it('sans slug utilisable, retombe sur clientId', () => {
    expect(
      buildClientDocumentsBucketName({
        prefix: 'p-',
        clientId: 'clabc123xyz',
        slug: '!!!',
      }),
    ).toBe('p-clabc123xyz');
  });

  it('tronque à 63 caractères sans finir par un tiret', () => {
    const longSlug = 'a'.repeat(80);
    const name = buildClientDocumentsBucketName({
      prefix: 'pre-',
      clientId: 'clid',
      slug: longSlug,
    });
    expect(name.length).toBeLessThanOrEqual(63);
    expect(name).not.toMatch(/-$/);
    expect(name.startsWith('pre-')).toBe(true);
  });
});

import {
  buildSmtpTransportOptions,
  formatSmtpSendResultLogLine,
  resolveSmtpPasswordEnv,
} from './smtp-transport.util';

describe('buildSmtpTransportOptions', () => {
  const backup = { ...process.env };

  afterEach(() => {
    process.env = { ...backup };
  });

  it('active requireTLS sur Brevo 587 sans SMTP_REQUIRE_TLS=false', () => {
    process.env.SMTP_HOST = 'smtp-relay.brevo.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_SECURE = 'false';
    process.env.SMTP_USER = 'u@example.com';
    process.env.SMTP_PASS = 'xsmtpsib-secret';
    delete process.env.SMTP_REQUIRE_TLS;

    const opts = buildSmtpTransportOptions();
    expect(opts.requireTLS).toBe(true);
    expect(opts.auth).toEqual({ user: 'u@example.com', pass: 'xsmtpsib-secret' });
  });

  it('respecte SMTP_REQUIRE_TLS=false pour Brevo', () => {
    process.env.SMTP_HOST = 'smtp-relay.brevo.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_SECURE = 'false';
    process.env.SMTP_REQUIRE_TLS = 'false';
    process.env.SMTP_USER = 'u';
    process.env.SMTP_PASS = 'p';

    const opts = buildSmtpTransportOptions();
    expect(opts.requireTLS).toBeUndefined();
  });

  it('n’ajoute pas requireTLS pour MailHog', () => {
    process.env.SMTP_HOST = 'mailhog';
    process.env.SMTP_PORT = '1025';
    process.env.SMTP_SECURE = 'false';
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.SMTP_PASSWORD;

    const opts = buildSmtpTransportOptions();
    expect(opts.requireTLS).toBeUndefined();
    expect(opts.auth).toBeUndefined();
  });
});

describe('resolveSmtpPasswordEnv', () => {
  const backup = { ...process.env };

  afterEach(() => {
    process.env = { ...backup };
  });

  it('lit uniquement SMTP_PASS', () => {
    delete process.env.SMTP_PASSWORD;
    process.env.SMTP_PASS = 'xsmtpsib-real';

    expect(resolveSmtpPasswordEnv()).toBe('xsmtpsib-real');
    const opts = buildSmtpTransportOptions();
    expect(opts.auth).toEqual({ user: '', pass: 'xsmtpsib-real' });
  });

  it('ignore SMTP_PASSWORD même si défini', () => {
    process.env.SMTP_PASSWORD = 'legacy-only';
    process.env.SMTP_PASS = 'from-smtp-pass';

    expect(resolveSmtpPasswordEnv()).toBe('from-smtp-pass');
  });
});

describe('formatSmtpSendResultLogLine', () => {
  it('formate la réponse SMTP Brevo / messageId', () => {
    const line = formatSmtpSendResultLogLine('ctx=1', {
      messageId: '<abc@brevo>',
      response: '250 2.0.0 Ok: queued as <msg@infra>',
      accepted: ['user@example.com'],
      rejected: [],
    });
    expect(line).toContain('messageId=<abc@brevo>');
    expect(line).toContain('250 2.0.0 Ok: queued');
    expect(line).toContain('accepted=user@example.com');
  });
});

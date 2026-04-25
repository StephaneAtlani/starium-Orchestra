import { EmailService } from './email.service';

describe('EmailService SMTP mode', () => {
  const envBackup = { ...process.env };

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it('autorise log-only en development si SMTP absent', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.SMTP_HOST;

    const service = new EmailService(
      { emailDelivery: {}, notification: {}, clientUser: {} } as any,
      {} as any,
      {} as any,
    );

    expect(service.isLogOnlyMode()).toBe(true);
  });

  it('fail-fast en production si SMTP incomplet', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.SMTP_HOST;
    process.env.SMTP_PORT = '587';
    process.env.SMTP_FROM = 'no-reply@test.local';

    expect(
      () =>
        new EmailService(
          { emailDelivery: {}, notification: {}, clientUser: {} } as any,
          {} as any,
          {} as any,
        ),
    ).toThrow(/SMTP configuration missing/i);
  });
});

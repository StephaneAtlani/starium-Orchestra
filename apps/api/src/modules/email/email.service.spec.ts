import { EmailDeliveryStatus, Prisma } from '@prisma/client';
import { ServiceUnavailableException } from '@nestjs/common';
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

  it('queueEmail persiste actionUrl / corps et enfile BullMQ en production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.SMTP_HOST = 'smtp.test';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_FROM = 'from@test';

    const create = jest.fn().mockResolvedValue({ id: 'del-1' });
    const enqueueSendEmail = jest.fn().mockResolvedValue(undefined);
    const service = new EmailService(
      {
        emailDelivery: { create },
        $executeRaw: jest.fn().mockResolvedValue(1),
      } as any,
      { enqueueSendEmail } as any,
      {} as any,
    );

    await service.queueEmail({
      clientId: 'client-1',
      recipient: 'u@example.com',
      templateKey: 'email_identity_verify',
      title: 'Vérifier',
      message: 'Cliquez',
      actionUrl: 'http://localhost/api/email-identities/verify?token=abc',
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clientId: 'client-1',
        recipient: 'u@example.com',
        templateKey: 'email_identity_verify',
        actionUrl: 'http://localhost/api/email-identities/verify?token=abc',
        emailBodyTitle: 'Vérifier',
        emailBodyMessage: expect.stringContaining('Cliquez'),
        status: EmailDeliveryStatus.PENDING,
      }),
      select: { id: true },
    });
    expect(enqueueSendEmail).toHaveBeenCalledWith({
      emailDeliveryId: 'del-1',
      mimeHtml: expect.stringContaining('Cliquez'),
    });
  });

  it('queueEmail enfile si EMAIL_DELIVERIES_INLINE=false (même hors production)', async () => {
    process.env.NODE_ENV = 'test';
    process.env.EMAIL_DELIVERIES_INLINE = 'false';
    delete process.env.SMTP_HOST;

    const create = jest.fn().mockResolvedValue({ id: 'del-2' });
    const enqueueSendEmail = jest.fn().mockResolvedValue(undefined);
    const service = new EmailService(
      {
        emailDelivery: { create },
        $executeRaw: jest.fn().mockResolvedValue(1),
      } as any,
      { enqueueSendEmail } as any,
      {} as any,
    );

    await service.queueEmail({
      clientId: 'client-1',
      recipient: 'u@example.com',
      templateKey: 'generic_notification',
      title: 'Hello',
      message: 'World',
      actionUrl: null,
    });

    expect(enqueueSendEmail).toHaveBeenCalledWith({
      emailDeliveryId: 'del-2',
      mimeHtml: expect.any(String),
    });
  });

  it('queueEmail lève ServiceUnavailable sur P2022 (schéma DB non migré)', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.SMTP_HOST;

    const p2022 = new Prisma.PrismaClientKnownRequestError('column missing', {
      code: 'P2022',
      clientVersion: 'test',
    });
    const create = jest.fn().mockRejectedValue(p2022);
    const service = new EmailService(
      { emailDelivery: { create } } as any,
      { enqueueSendEmail: jest.fn() } as any,
      {} as any,
    );

    await expect(
      service.queueEmail({
        clientId: 'client-1',
        recipient: 'u@example.com',
        templateKey: 'generic_notification',
        title: 'H',
        message: 'W',
        actionUrl: null,
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('queueEmail retombe en traitement inline si enqueue échoue (hors production)', async () => {
    process.env.NODE_ENV = 'development';
    process.env.EMAIL_DELIVERIES_INLINE = 'false';
    delete process.env.SMTP_HOST;

    const deliveryRow = {
      id: 'del-fb',
      clientId: 'c1',
      recipient: 'a@b.c',
      templateKey: 'generic_notification',
      subject: '[Notification] Hello',
      emailBodyTitle: 'Hello',
      emailBodyMessage: 'World',
      emailBodyHtml: '<h3>Hello</h3><p>World</p>',
      actionUrl: null,
      alert: null,
      createdByUserId: null,
    };
    const create = jest.fn().mockResolvedValue({ id: 'del-fb' });
    const findUnique = jest.fn().mockResolvedValue(deliveryRow);
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const update = jest.fn().mockResolvedValue({});
    const auditCreate = jest.fn().mockResolvedValue(undefined);
    const enqueueSendEmail = jest
      .fn()
      .mockRejectedValue(new Error('ECONNREFUSED'));

    const service = new EmailService(
      {
        emailDelivery: { create, findUnique, updateMany, update },
        $executeRaw: jest.fn().mockResolvedValue(1),
      } as any,
      { enqueueSendEmail } as any,
      { create: auditCreate } as any,
    );

    await service.queueEmail({
      clientId: 'c1',
      recipient: 'a@b.c',
      templateKey: 'generic_notification',
      title: 'Hello',
      message: 'World',
      actionUrl: null,
    });

    expect(enqueueSendEmail).toHaveBeenCalledWith({
      emailDeliveryId: 'del-fb',
      mimeHtml: expect.any(String),
    });
    expect(findUnique).toHaveBeenCalled();
    expect(auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'email.sent' }),
    );
  });

  it('processEmailDelivery ignore un envoi déjà SENT (idempotence / retries BullMQ)', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.SMTP_HOST;

    const findUnique = jest.fn().mockResolvedValue({
      id: 'del-sent',
      status: EmailDeliveryStatus.SENT,
      recipient: 'a@b.c',
      templateKey: 'generic_notification',
    });
    const updateMany = jest.fn();
    const service = new EmailService(
      { emailDelivery: { findUnique, updateMany } } as any,
      {} as any,
      { create: jest.fn() } as any,
    );

    await service.processEmailDelivery('del-sent');

    expect(updateMany).not.toHaveBeenCalled();
  });

  it('processEmailDelivery envoie le HTML persisté pour project_review_report', async () => {
    process.env.NODE_ENV = 'development';
    process.env.SMTP_HOST = 'mailhog';
    process.env.SMTP_PORT = '1025';
    process.env.SMTP_FROM = 'noreply@test.local';

    const richHtml =
      '<div style="font-family:sans-serif"><h1>Rapport riche</h1><p>KPIs</p></div><p><a href="http://localhost:3000/x">Ouvrir</a></p>';
    const deliveryRow = {
      id: 'del-cr',
      clientId: 'c1',
      recipient: 'a@b.c',
      templateKey: 'project_review_report',
      subject: 'Compte rendu — COPIL',
      emailBodyTitle: 'Compte rendu — Projet',
      emailBodyMessage:
        'Compte rendu — Projet\n\n(Compte rendu complet au format HTML.)',
      emailBodyHtml: richHtml,
      actionUrl: 'http://localhost:3000/x',
      alert: null,
      createdByUserId: null,
    };

    const findUnique = jest
      .fn()
      .mockResolvedValueOnce(deliveryRow)
      .mockResolvedValue({ status: EmailDeliveryStatus.RETRYING });
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const update = jest.fn().mockResolvedValue({});
    const sendMail = jest.fn().mockResolvedValue({ messageId: 'm1' });
    const auditCreate = jest.fn().mockResolvedValue(undefined);

    const service = new EmailService(
      {
        emailDelivery: { findUnique, updateMany, update },
      } as any,
      {} as any,
      { create: auditCreate } as any,
    );
    (service as any).transporter = { sendMail };

    await service.processEmailDelivery('del-cr');

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: richHtml,
        text: deliveryRow.emailBodyMessage,
      }),
    );
  });

  it('processEmailDelivery recharge le HTML via SQL si le client Prisma ne l’expose pas', async () => {
    process.env.NODE_ENV = 'development';
    process.env.SMTP_HOST = 'mailhog';
    process.env.SMTP_PORT = '1025';
    process.env.SMTP_FROM = 'noreply@test.local';

    const richHtml = '<div><h1>Via SQL</h1></div>';
    const deliveryRow = {
      id: 'del-sql',
      clientId: 'c1',
      recipient: 'a@b.c',
      templateKey: 'project_review_report',
      subject: 'CR',
      emailBodyTitle: 'CR',
      emailBodyMessage: 'Résumé court',
      emailBodyHtml: null,
      actionUrl: 'http://localhost:3000/x',
      alert: null,
      createdByUserId: null,
    };

    const findUnique = jest
      .fn()
      .mockResolvedValueOnce(deliveryRow)
      .mockResolvedValue({ status: EmailDeliveryStatus.RETRYING });
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const update = jest.fn().mockResolvedValue({});
    const queryRaw = jest
      .fn()
      .mockResolvedValue([{ emailBodyHtml: richHtml }]);
    const sendMail = jest.fn().mockResolvedValue({ messageId: 'm1' });

    const service = new EmailService(
      {
        emailDelivery: { findUnique, updateMany, update },
        $queryRaw: queryRaw,
      } as any,
      {} as any,
      { create: jest.fn() } as any,
    );
    (service as any).transporter = { sendMail };

    await service.processEmailDelivery('del-sql');

    expect(queryRaw).toHaveBeenCalled();
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ html: richHtml }),
    );
  });

  it('processEmailDelivery échoue pour project_review_report sans HTML', async () => {
    process.env.NODE_ENV = 'development';
    process.env.SMTP_HOST = 'mailhog';

    const deliveryRow = {
      id: 'del-no-html',
      clientId: 'c1',
      recipient: 'a@b.c',
      templateKey: 'project_review_report',
      subject: 'CR',
      emailBodyTitle: 'CR',
      emailBodyMessage: 'texte',
      emailBodyHtml: null,
      actionUrl: null,
      alert: null,
      createdByUserId: null,
    };

    const findUnique = jest
      .fn()
      .mockResolvedValueOnce(deliveryRow)
      .mockResolvedValue({ status: EmailDeliveryStatus.RETRYING });
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const queryRaw = jest.fn().mockResolvedValue([{ emailBodyHtml: null }]);

    const service = new EmailService(
      {
        emailDelivery: { findUnique, updateMany },
        $queryRaw: queryRaw,
      } as any,
      {} as any,
      { create: jest.fn() } as any,
    );

    await expect(service.processEmailDelivery('del-no-html')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('queueEmail refuse project_review_report si HTML non persisté', async () => {
    process.env.NODE_ENV = 'production';
    process.env.EMAIL_DELIVERIES_INLINE = 'false';
    process.env.SMTP_HOST = 'smtp.test';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_FROM = 'from@test';

    const create = jest.fn().mockResolvedValue({ id: 'del-cr-fail' });
    const executeRaw = jest.fn().mockResolvedValue(1);
    const queryRaw = jest.fn().mockResolvedValue([{ htmlLen: BigInt(0) }]);
    const enqueueSendEmail = jest.fn();

    const service = new EmailService(
      {
        emailDelivery: { create },
        $executeRaw: executeRaw,
        $queryRaw: queryRaw,
      } as any,
      { enqueueSendEmail } as any,
      {} as any,
    );

    await expect(
      service.queueEmail({
        clientId: 'c1',
        recipient: 'a@b.c',
        templateKey: 'project_review_report',
        title: 'CR',
        message: 'texte long',
        htmlBody: '<div><h1>HTML</h1></div>',
        actionUrl: 'http://localhost/x',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(enqueueSendEmail).not.toHaveBeenCalled();
  });
});

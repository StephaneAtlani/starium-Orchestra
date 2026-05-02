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
      { emailDelivery: { create } } as any,
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
        emailBodyMessage: 'Cliquez',
        status: EmailDeliveryStatus.PENDING,
      }),
      select: { id: true },
    });
    expect(enqueueSendEmail).toHaveBeenCalledWith({ emailDeliveryId: 'del-1' });
  });

  it('queueEmail enfile si EMAIL_DELIVERIES_INLINE=false (même hors production)', async () => {
    process.env.NODE_ENV = 'test';
    process.env.EMAIL_DELIVERIES_INLINE = 'false';
    delete process.env.SMTP_HOST;

    const create = jest.fn().mockResolvedValue({ id: 'del-2' });
    const enqueueSendEmail = jest.fn().mockResolvedValue(undefined);
    const service = new EmailService(
      { emailDelivery: { create } } as any,
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

    expect(enqueueSendEmail).toHaveBeenCalledWith({ emailDeliveryId: 'del-2' });
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
      actionUrl: null,
      alert: null,
      createdByUserId: null,
    };
    const create = jest.fn().mockResolvedValue({ id: 'del-fb' });
    const findUnique = jest.fn().mockResolvedValue(deliveryRow);
    const update = jest.fn().mockResolvedValue({});
    const auditCreate = jest.fn().mockResolvedValue(undefined);
    const enqueueSendEmail = jest
      .fn()
      .mockRejectedValue(new Error('ECONNREFUSED'));

    const service = new EmailService(
      {
        emailDelivery: { create, findUnique, update },
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

    expect(enqueueSendEmail).toHaveBeenCalledWith({ emailDeliveryId: 'del-fb' });
    expect(findUnique).toHaveBeenCalled();
    expect(auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'email.sent' }),
    );
  });
});

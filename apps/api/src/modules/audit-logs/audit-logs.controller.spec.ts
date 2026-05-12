import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import { REQUIRE_PERMISSIONS_KEY } from '../../common/decorators/require-permissions.decorator';
import { AuditLogsController } from './audit-logs.controller';

describe('AuditLogsController', () => {
  it('should be defined', () => {
    const controller = new AuditLogsController({} as any);
    expect(controller).toBeDefined();
  });

  it("should require 'audit_logs.read' permission on GET /audit-logs", () => {
    const handler = AuditLogsController.prototype.findAll;
    const required = Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, handler);
    expect(required).toEqual(['audit_logs.read']);
  });

  it('rejects when action and actionPrefix are both provided', () => {
    const listForClient = jest.fn();
    const controller = new AuditLogsController({ listForClient } as any);
    expect(() =>
      controller.findAll('cid', {
        action: 'organization.unit.created',
        actionPrefix: 'organization.',
      } as any),
    ).toThrow(BadRequestException);
    expect(listForClient).not.toHaveBeenCalled();
  });

  it('allows action alone (backward compatible)', () => {
    const listForClient = jest.fn().mockResolvedValue([]);
    const controller = new AuditLogsController({ listForClient } as any);
    void controller.findAll('cid', { action: 'project.created' } as any);
    expect(listForClient).toHaveBeenCalledWith({
      clientId: 'cid',
      query: expect.objectContaining({ action: 'project.created' }),
    });
  });
});


import 'reflect-metadata';
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
}


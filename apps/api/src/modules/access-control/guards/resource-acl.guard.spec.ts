import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccessControlService } from '../access-control.service';
import { RESOURCE_ACL_METADATA_KEY } from '../decorators/require-resource-acl.decorator';
import { ResourceAclGuard } from './resource-acl.guard';

describe('ResourceAclGuard', () => {
  let guard: ResourceAclGuard;
  let accessControl: jest.Mocked<
    Pick<
      AccessControlService,
      | 'resolveResourceAclRoute'
      | 'canReadResource'
      | 'canWriteResource'
      | 'canAdminResource'
    >
  >;
  let reflector: { getAllAndOverride: jest.Mock };

  const execContext = (
    params: Record<string, string>,
    userId?: string,
    clientId?: string,
  ) =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => ({
          params,
          user: userId !== undefined ? { userId } : undefined,
          activeClient: clientId !== undefined ? { id: clientId } : undefined,
        }),
      }),
    }) as any;

  beforeEach(() => {
    accessControl = {
      resolveResourceAclRoute: jest.fn().mockReturnValue({
        resourceType: 'PROJECT',
        resourceId: 'c999999999999999999999999',
      }),
      canReadResource: jest.fn().mockResolvedValue(true),
      canWriteResource: jest.fn().mockResolvedValue(true),
      canAdminResource: jest.fn().mockResolvedValue(true),
    };
    reflector = { getAllAndOverride: jest.fn() };
    guard = new ResourceAclGuard(reflector as unknown as Reflector, accessControl as any);
  });

  it('sans décorateur : autorise', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    await expect(
      guard.canActivate(execContext({ resourceType: 'PROJECT', resourceId: 'c' })),
    ).resolves.toBe(true);
    expect(accessControl.canReadResource).not.toHaveBeenCalled();
  });

  it('read : refuse si canReadResource false (strict, sans bypass rôle)', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) =>
      key === RESOURCE_ACL_METADATA_KEY
        ? { operation: 'read' as const }
        : undefined,
    );
    accessControl.canReadResource.mockResolvedValue(false);

    await expect(
      guard.canActivate(
        execContext(
          { resourceType: 'project', resourceId: 'c999999999999999999999999' },
          'u1',
          'c1',
        ),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(accessControl.resolveResourceAclRoute).toHaveBeenCalledWith(
      'project',
      'c999999999999999999999999',
    );
    expect(accessControl.canReadResource).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'c1',
        userId: 'u1',
        resourceTypeNormalized: 'PROJECT',
      }),
    );
  });

  it('write : appelle canWriteResource', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) =>
      key === RESOURCE_ACL_METADATA_KEY
        ? { operation: 'write' as const }
        : undefined,
    );

    await guard.canActivate(
      execContext({ resourceType: 'PROJECT', resourceId: 'c999999999999999999999999' }, 'u1', 'cl'),
    );

    expect(accessControl.canWriteResource).toHaveBeenCalled();
  });
});

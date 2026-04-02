import 'reflect-metadata';
import { PATH_METADATA } from '@nestjs/common/constants';
import { REQUIRE_PERMISSIONS_KEY } from '../../common/decorators/require-permissions.decorator';
import { ManagerScopesController } from './manager-scopes.controller';

describe('ManagerScopesController', () => {
  it('route preview avant :managerCollaboratorId seul', () => {
    const previewPath = Reflect.getMetadata(
      PATH_METADATA,
      ManagerScopesController.prototype.preview,
    );
    const getPath = Reflect.getMetadata(PATH_METADATA, ManagerScopesController.prototype.get);
    expect(previewPath).toBe(':managerCollaboratorId/preview');
    expect(getPath).toBe(':managerCollaboratorId');
  });

  it('GET preview et GET config = teams.read ; PUT = teams.manage_scopes', () => {
    expect(
      Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, ManagerScopesController.prototype.preview),
    ).toEqual(['teams.read']);
    expect(
      Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, ManagerScopesController.prototype.get),
    ).toEqual(['teams.read']);
    expect(
      Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, ManagerScopesController.prototype.put),
    ).toEqual(['teams.manage_scopes']);
  });
});

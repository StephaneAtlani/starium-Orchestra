import 'reflect-metadata';
import { REQUIRE_PERMISSIONS_KEY } from '../../common/decorators/require-permissions.decorator';
import { ProjectResourceAssignmentsController } from './project-resource-assignments.controller';

describe('ProjectResourceAssignmentsController', () => {
  /** Ordre de déclaration imposé (RFC-TEAM-008) : liste → create → cancel → détail → patch */
  const HANDLER_ORDER = [
    'list',
    'create',
    'cancel',
    'getById',
    'update',
  ] as const;

  it('ordre des handlers sur le prototype', () => {
    expect(
      Object.getOwnPropertyNames(ProjectResourceAssignmentsController.prototype)
        .filter((k) => k !== 'constructor')
        .filter((k) => typeof (ProjectResourceAssignmentsController.prototype as Record<string, unknown>)[k] === 'function'),
    ).toEqual([...HANDLER_ORDER]);
  });

  it('permissions team_assignments.* par route', () => {
    const proto = ProjectResourceAssignmentsController.prototype;
    expect(
      Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, proto.list),
    ).toEqual(['team_assignments.read']);
    expect(
      Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, proto.getById),
    ).toEqual(['team_assignments.read']);
    expect(
      Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, proto.create),
    ).toEqual(['team_assignments.manage']);
    expect(
      Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, proto.update),
    ).toEqual(['team_assignments.manage']);
    expect(
      Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, proto.cancel),
    ).toEqual(['team_assignments.manage']);
  });
});

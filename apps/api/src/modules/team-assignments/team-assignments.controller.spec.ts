import 'reflect-metadata';
import { REQUIRE_PERMISSIONS_KEY } from '../../common/decorators/require-permissions.decorator';
import { TeamAssignmentsController } from './team-assignments.controller';

describe('TeamAssignmentsController', () => {
  it('permissions team_assignments.* par route', () => {
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSIONS_KEY,
        TeamAssignmentsController.prototype.list,
      ),
    ).toEqual(['team_assignments.read']);
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSIONS_KEY,
        TeamAssignmentsController.prototype.create,
      ),
    ).toEqual(['team_assignments.manage']);
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSIONS_KEY,
        TeamAssignmentsController.prototype.cancel,
      ),
    ).toEqual(['team_assignments.manage']);
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSIONS_KEY,
        TeamAssignmentsController.prototype.getById,
      ),
    ).toEqual(['team_assignments.read']);
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSIONS_KEY,
        TeamAssignmentsController.prototype.update,
      ),
    ).toEqual(['team_assignments.manage']);
  });
});

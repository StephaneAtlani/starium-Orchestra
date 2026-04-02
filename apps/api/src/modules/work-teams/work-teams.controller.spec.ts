import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { PATH_METADATA } from '@nestjs/common/constants';
import { REQUIRE_PERMISSIONS_KEY } from '../../common/decorators/require-permissions.decorator';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkTeamMembershipsService } from './work-team-memberships.service';
import { WorkTeamsController } from './work-teams.controller';
import { WorkTeamsService } from './work-teams.service';

const passGuard = { canActivate: () => true };

describe('WorkTeamsController', () => {
  const workTeams = {
    tree: jest.fn(),
    list: jest.fn(),
    create: jest.fn(),
    getById: jest.fn(),
    update: jest.fn(),
    archive: jest.fn(),
    restore: jest.fn(),
  };
  const memberships = {
    listMembers: jest.fn(),
    addMember: jest.fn(),
    updateMember: jest.fn(),
    removeMember: jest.fn(),
  };

  beforeEach(async () => {
    await Test.createTestingModule({
      controllers: [WorkTeamsController],
      providers: [
        { provide: WorkTeamsService, useValue: workTeams },
        { provide: WorkTeamMembershipsService, useValue: memberships },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(passGuard)
      .overrideGuard(ActiveClientGuard)
      .useValue(passGuard)
      .overrideGuard(ModuleAccessGuard)
      .useValue(passGuard)
      .overrideGuard(PermissionsGuard)
      .useValue(passGuard)
      .compile();
    jest.clearAllMocks();
  });

  it('route tree avant :id (pas de collision)', () => {
    const treePath = Reflect.getMetadata(PATH_METADATA, WorkTeamsController.prototype.tree);
    const idPath = Reflect.getMetadata(PATH_METADATA, WorkTeamsController.prototype.getById);
    expect(treePath).toBe('tree');
    expect(idPath).toBe(':id');
  });

  it('permissions teams.read sur tree et list', () => {
    expect(
      Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, WorkTeamsController.prototype.tree),
    ).toEqual(['teams.read']);
    expect(
      Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, WorkTeamsController.prototype.list),
    ).toEqual(['teams.read']);
  });

  it('permissions teams.update sur create et members', () => {
    expect(
      Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, WorkTeamsController.prototype.create),
    ).toEqual(['teams.update']);
    expect(
      Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, WorkTeamsController.prototype.addMember),
    ).toEqual(['teams.update']);
  });
});

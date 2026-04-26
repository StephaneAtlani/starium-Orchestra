import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { PATH_METADATA } from '@nestjs/common/constants';
import { REQUIRE_ANY_PERMISSIONS_KEY } from '../../common/decorators/require-any-permissions.decorator';
import { REQUIRE_PERMISSIONS_KEY } from '../../common/decorators/require-permissions.decorator';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkTeamMembershipsService } from '../work-teams/work-team-memberships.service';
import { CollaboratorsController } from './collaborators.controller';
import { CollaboratorsService } from './collaborators.service';
import { UpdateCollaboratorDto } from './dto/update-collaborator.dto';
import { ListCollaboratorTagsOptionsQueryDto } from './dto/list-collaborator-tags-options.query.dto';

const passGuard = { canActivate: () => true };

describe('CollaboratorsController', () => {
  const service = {
    list: jest.fn(),
    create: jest.fn(),
    listManagersOptions: jest.fn(),
    listTagsOptions: jest.fn(),
    getById: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    softDelete: jest.fn(),
  };
  const workTeamMemberships = {
    listTeamsForCollaborator: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [CollaboratorsController],
      providers: [
        { provide: CollaboratorsService, useValue: service },
        { provide: WorkTeamMembershipsService, useValue: workTeamMemberships },
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

    void module.get(CollaboratorsController);
    jest.clearAllMocks();
  });

  it('route options/managers est déclarée explicitement (collision guard)', () => {
    const path = Reflect.getMetadata(
      PATH_METADATA,
      CollaboratorsController.prototype.listManagersOptions,
    );
    expect(path).toBe('options/managers');
  });

  it('route options/tags est déclarée explicitement (collision guard)', () => {
    const path = Reflect.getMetadata(
      PATH_METADATA,
      CollaboratorsController.prototype.listTagsOptions,
    );
    expect(path).toBe('options/tags');
  });

  it('route :id/work-teams est déclarée avant :id (collision)', () => {
    const pathWorkTeams = Reflect.getMetadata(
      PATH_METADATA,
      CollaboratorsController.prototype.listWorkTeamsForCollaborator,
    );
    const pathById = Reflect.getMetadata(
      PATH_METADATA,
      CollaboratorsController.prototype.getById,
    );
    expect(pathWorkTeams).toBe(':id/work-teams');
    expect(pathById).toBe(':id');
  });

  it('applique teams.read sur listWorkTeamsForCollaborator', () => {
    const perms = Reflect.getMetadata(
      REQUIRE_PERMISSIONS_KEY,
      CollaboratorsController.prototype.listWorkTeamsForCollaborator,
    );
    expect(perms).toEqual(['teams.read']);
  });

  it('applique collaborators.read OU create OU update OU teams.update sur listManagersOptions', () => {
    const perms = Reflect.getMetadata(
      REQUIRE_ANY_PERMISSIONS_KEY,
      CollaboratorsController.prototype.listManagersOptions,
    );
    expect(perms).toEqual([
      'collaborators.read',
      'collaborators.create',
      'collaborators.update',
      'teams.update',
    ]);
  });

  it('applique permission collaborators.read sur list', () => {
    const perms = Reflect.getMetadata(
      REQUIRE_PERMISSIONS_KEY,
      CollaboratorsController.prototype.list,
    );
    expect(perms).toEqual(['collaborators.read']);
  });

  it('applique permission collaborators.create sur create', () => {
    const perms = Reflect.getMetadata(
      REQUIRE_PERMISSIONS_KEY,
      CollaboratorsController.prototype.create,
    );
    expect(perms).toEqual(['collaborators.create']);
  });

  it('applique permission collaborators.update sur update et updateStatus', () => {
    const p1 = Reflect.getMetadata(
      REQUIRE_PERMISSIONS_KEY,
      CollaboratorsController.prototype.update,
    );
    const p2 = Reflect.getMetadata(
      REQUIRE_PERMISSIONS_KEY,
      CollaboratorsController.prototype.updateStatus,
    );
    expect(p1).toEqual(['collaborators.update']);
    expect(p2).toEqual(['collaborators.update']);
  });

  it('applique permission collaborators.delete sur softDelete', () => {
    const perms = Reflect.getMetadata(
      REQUIRE_PERMISSIONS_KEY,
      CollaboratorsController.prototype.softDelete,
    );
    expect(perms).toEqual(['collaborators.delete']);
  });

  it('UpdateCollaboratorDto ne contient pas status', () => {
    const dto = new UpdateCollaboratorDto();
    expect(dto).not.toHaveProperty('status');
    expect(Object.getOwnPropertyDescriptor(UpdateCollaboratorDto.prototype, 'status')).toBeUndefined();
  });

  it('UpdateCollaboratorDto ne contient pas les champs hors scope (skills, assignments, metadata, externalDirectoryType)', () => {
    const keys = Object.getOwnPropertyNames(new UpdateCollaboratorDto());
    expect(keys).not.toContain('skills');
    expect(keys).not.toContain('assignments');
    expect(keys).not.toContain('metadata');
    expect(keys).not.toContain('externalDirectoryType');
  });

  it('ListCollaboratorTagsOptionsQueryDto a limit=50 par défaut', () => {
    const dto = new ListCollaboratorTagsOptionsQueryDto();
    expect(dto.limit).toBe(50);
  });

  it('route options/tags utilise le DTO dédié tags', () => {
    const paramTypes = Reflect.getMetadata(
      'design:paramtypes',
      CollaboratorsController.prototype,
      'listTagsOptions',
    );
    const hasTagsDto = paramTypes?.some(
      (t: any) => t === ListCollaboratorTagsOptionsQueryDto,
    );
    expect(hasTagsDto).toBe(true);
  });
});

import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { PATH_METADATA } from '@nestjs/common/constants';
import { REQUIRE_PERMISSIONS_KEY } from '../../common/decorators/require-permissions.decorator';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CollaboratorsController } from './collaborators.controller';
import { CollaboratorsService } from './collaborators.service';

const passGuard = { canActivate: () => true };

describe('CollaboratorsController', () => {
  let controller: CollaboratorsController;
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

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [CollaboratorsController],
      providers: [{ provide: CollaboratorsService, useValue: service }],
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

    controller = module.get(CollaboratorsController);
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
});

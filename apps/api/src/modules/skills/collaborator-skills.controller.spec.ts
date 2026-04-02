import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { REQUIRE_PERMISSIONS_KEY } from '../../common/decorators/require-permissions.decorator';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CollaboratorSkillsController } from './collaborator-skills.controller';
import { CollaboratorSkillsService } from './collaborator-skills.service';

const passGuard = { canActivate: () => true };

describe('CollaboratorSkillsController', () => {
  const service = {
    listByCollaborator: jest.fn(),
    create: jest.fn(),
    bulkCreate: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    validate: jest.fn(),
    invalidate: jest.fn(),
  };

  beforeEach(async () => {
    await Test.createTestingModule({
      controllers: [CollaboratorSkillsController],
      providers: [{ provide: CollaboratorSkillsService, useValue: service }],
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

  it('GET liste = skills.read', () => {
    const p = Reflect.getMetadata(
      REQUIRE_PERMISSIONS_KEY,
      CollaboratorSkillsController.prototype.list,
    );
    expect(p).toEqual(['skills.read']);
  });

  it('POST create / bulk / patch / delete / validate / invalidate = skills.update', () => {
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSIONS_KEY,
        CollaboratorSkillsController.prototype.create,
      ),
    ).toEqual(['skills.update']);
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSIONS_KEY,
        CollaboratorSkillsController.prototype.bulkCreate,
      ),
    ).toEqual(['skills.update']);
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSIONS_KEY,
        CollaboratorSkillsController.prototype.update,
      ),
    ).toEqual(['skills.update']);
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSIONS_KEY,
        CollaboratorSkillsController.prototype.remove,
      ),
    ).toEqual(['skills.update']);
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSIONS_KEY,
        CollaboratorSkillsController.prototype.validate,
      ),
    ).toEqual(['skills.update']);
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSIONS_KEY,
        CollaboratorSkillsController.prototype.invalidate,
      ),
    ).toEqual(['skills.update']);
  });
});

import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { PATH_METADATA } from '@nestjs/common/constants';
import { REQUIRE_PERMISSIONS_KEY } from '../../common/decorators/require-permissions.decorator';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SkillCategoriesController } from './skill-categories.controller';
import { SkillsController } from './skills.controller';
import { SkillsService } from './skills.service';
import { UpdateSkillDto } from './dto/update-skill.dto';

const passGuard = { canActivate: () => true };

describe('Skills controllers', () => {
  const service = {
    listSkillOptions: jest.fn(),
    listSkills: jest.fn(),
    createSkill: jest.fn(),
    getSkillById: jest.fn(),
    updateSkill: jest.fn(),
    archiveSkill: jest.fn(),
    restoreSkill: jest.fn(),
    listSkillCategoryOptions: jest.fn(),
    listSkillCategories: jest.fn(),
    createSkillCategory: jest.fn(),
    getSkillCategoryById: jest.fn(),
    updateSkillCategory: jest.fn(),
    deleteSkillCategory: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [SkillsController, SkillCategoriesController],
      providers: [{ provide: SkillsService, useValue: service }],
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
    module.get(SkillsController);
    module.get(SkillCategoriesController);
    jest.clearAllMocks();
  });

  it('route skills/options est déclarée explicitement avant :id', () => {
    const path = Reflect.getMetadata(PATH_METADATA, SkillsController.prototype.listOptions);
    expect(path).toBe('options');
  });

  it('route skill-categories/options est déclarée explicitement avant :id', () => {
    const path = Reflect.getMetadata(
      PATH_METADATA,
      SkillCategoriesController.prototype.listOptions,
    );
    expect(path).toBe('options');
  });

  it('permissions skills.* sont appliquées', () => {
    const read = Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, SkillsController.prototype.list);
    const create = Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, SkillsController.prototype.create);
    const update = Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, SkillsController.prototype.update);
    const del = Reflect.getMetadata(
      REQUIRE_PERMISSIONS_KEY,
      SkillCategoriesController.prototype.delete,
    );
    expect(read).toEqual(['skills.read']);
    expect(create).toEqual(['skills.create']);
    expect(update).toEqual(['skills.update']);
    expect(del).toEqual(['skills.delete']);
  });

  it('UpdateSkillDto ne contient pas status', () => {
    const dto = new UpdateSkillDto();
    expect(dto).not.toHaveProperty('status');
    expect(Object.getOwnPropertyDescriptor(UpdateSkillDto.prototype, 'status')).toBeUndefined();
  });
});

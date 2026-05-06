import 'reflect-metadata';
import { RequestMethod } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { REQUIRE_PERMISSIONS_KEY } from '../../common/decorators/require-permissions.decorator';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StrategicDirectionStrategyController } from './strategic-direction-strategy.controller';
import { StrategicDirectionStrategyService } from './strategic-direction-strategy.service';

const passGuard = { canActivate: () => true };

describe('StrategicDirectionStrategyController', () => {
  const service = {
    list: jest.fn(),
    create: jest.fn(),
    getLinks: jest.fn(),
    replaceStrategyAxes: jest.fn(),
    replaceStrategyObjectives: jest.fn(),
    getById: jest.fn(),
    update: jest.fn(),
    submit: jest.fn(),
    archive: jest.fn(),
    review: jest.fn(),
  };

  let controller: StrategicDirectionStrategyController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [StrategicDirectionStrategyController],
      providers: [{ provide: StrategicDirectionStrategyService, useValue: service }],
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

    controller = module.get(StrategicDirectionStrategyController);
    jest.clearAllMocks();
  });

  it('déclare les routes stratégie dont liens axes/objectifs avant :id générique', () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, StrategicDirectionStrategyController.prototype.list),
    ).toBe('/');
    expect(
      Reflect.getMetadata(PATH_METADATA, StrategicDirectionStrategyController.prototype.create),
    ).toBe('/');
    expect(
      Reflect.getMetadata(PATH_METADATA, StrategicDirectionStrategyController.prototype.getLinks),
    ).toBe(':id/links');
    expect(
      Reflect.getMetadata(PATH_METADATA, StrategicDirectionStrategyController.prototype.replaceAxes),
    ).toBe(':id/axes');
    expect(
      Reflect.getMetadata(METHOD_METADATA, StrategicDirectionStrategyController.prototype.replaceAxes),
    ).toBe(RequestMethod.PUT);
    expect(
      Reflect.getMetadata(PATH_METADATA, StrategicDirectionStrategyController.prototype.replaceObjectives),
    ).toBe(':id/objectives');
    expect(
      Reflect.getMetadata(METHOD_METADATA, StrategicDirectionStrategyController.prototype.replaceObjectives),
    ).toBe(RequestMethod.PUT);
    expect(
      Reflect.getMetadata(PATH_METADATA, StrategicDirectionStrategyController.prototype.getById),
    ).toBe(':id');
    expect(
      Reflect.getMetadata(PATH_METADATA, StrategicDirectionStrategyController.prototype.update),
    ).toBe(':id');
    expect(
      Reflect.getMetadata(PATH_METADATA, StrategicDirectionStrategyController.prototype.submit),
    ).toBe(':id/submit');
    expect(
      Reflect.getMetadata(PATH_METADATA, StrategicDirectionStrategyController.prototype.archive),
    ).toBe(':id/archive');
    expect(
      Reflect.getMetadata(PATH_METADATA, StrategicDirectionStrategyController.prototype.review),
    ).toBe(':id/review');
  });

  it('applique les permissions exactes', () => {
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSIONS_KEY,
        StrategicDirectionStrategyController.prototype.list,
      ),
    ).toEqual(['strategic_direction_strategy.read']);
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSIONS_KEY,
        StrategicDirectionStrategyController.prototype.create,
      ),
    ).toEqual(['strategic_direction_strategy.create']);
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSIONS_KEY,
        StrategicDirectionStrategyController.prototype.getLinks,
      ),
    ).toEqual(['strategic_direction_strategy.read']);
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSIONS_KEY,
        StrategicDirectionStrategyController.prototype.replaceAxes,
      ),
    ).toEqual(['strategic_direction_strategy.update']);
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSIONS_KEY,
        StrategicDirectionStrategyController.prototype.replaceObjectives,
      ),
    ).toEqual(['strategic_direction_strategy.update']);
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSIONS_KEY,
        StrategicDirectionStrategyController.prototype.getById,
      ),
    ).toEqual(['strategic_direction_strategy.read']);
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSIONS_KEY,
        StrategicDirectionStrategyController.prototype.update,
      ),
    ).toEqual(['strategic_direction_strategy.update']);
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSIONS_KEY,
        StrategicDirectionStrategyController.prototype.submit,
      ),
    ).toEqual(['strategic_direction_strategy.update']);
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSIONS_KEY,
        StrategicDirectionStrategyController.prototype.archive,
      ),
    ).toEqual(['strategic_direction_strategy.update']);
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSIONS_KEY,
        StrategicDirectionStrategyController.prototype.review,
      ),
    ).toEqual(['strategic_direction_strategy.review']);
  });
});

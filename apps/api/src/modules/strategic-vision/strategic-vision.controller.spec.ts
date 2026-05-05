import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { REQUIRE_ANY_PERMISSIONS_KEY } from '../../common/decorators/require-any-permissions.decorator';
import { REQUIRE_PERMISSIONS_KEY } from '../../common/decorators/require-permissions.decorator';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StrategicVisionController } from './strategic-vision.controller';
import { StrategicVisionService } from './strategic-vision.service';

const passGuard = { canActivate: () => true };

describe('StrategicVisionController', () => {
  const serviceMock = {
    listVisions: jest.fn(),
    getKpis: jest.fn(),
    getKpisByDirection: jest.fn(),
    getAlerts: jest.fn(),
    createVision: jest.fn(),
    updateVision: jest.fn(),
    listAxes: jest.fn(),
    createAxis: jest.fn(),
    updateAxis: jest.fn(),
    listDirections: jest.fn(),
    createDirection: jest.fn(),
    updateDirection: jest.fn(),
    listObjectives: jest.fn(),
    createObjective: jest.fn(),
    updateObjective: jest.fn(),
    addObjectiveLink: jest.fn(),
    removeObjectiveLink: jest.fn(),
  };

  beforeEach(async () => {
    await Test.createTestingModule({
      controllers: [StrategicVisionController],
      providers: [{ provide: StrategicVisionService, useValue: serviceMock }],
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

  it('permissions strategic_vision.read sur routes GET', () => {
    expect(
      Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, StrategicVisionController.prototype.listVisions),
    ).toEqual(['strategic_vision.read']);
    expect(
      Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, StrategicVisionController.prototype.listAxes),
    ).toEqual(['strategic_vision.read']);
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSIONS_KEY,
        StrategicVisionController.prototype.listObjectives,
      ),
    ).toEqual(['strategic_vision.read']);
    expect(
      Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, StrategicVisionController.prototype.getKpis),
    ).toEqual(['strategic_vision.read']);
    expect(
      Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, StrategicVisionController.prototype.getAlerts),
    ).toEqual(['strategic_vision.read']);
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSIONS_KEY,
        StrategicVisionController.prototype.getKpisByDirection,
      ),
    ).toEqual(['strategic_vision.read']);
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSIONS_KEY,
        StrategicVisionController.prototype.listDirections,
      ),
    ).toEqual(['strategic_vision.read']);
  });

  it('permissions strategic_vision.create sur routes POST de création', () => {
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSIONS_KEY,
        StrategicVisionController.prototype.createVision,
      ),
    ).toEqual(['strategic_vision.create']);
    expect(
      Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, StrategicVisionController.prototype.createAxis),
    ).toEqual(['strategic_vision.create']);
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSIONS_KEY,
        StrategicVisionController.prototype.createObjective,
      ),
    ).toEqual(['strategic_vision.create']);
  });

  it('permissions strategic_vision.manage_links sur routes de liens', () => {
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSIONS_KEY,
        StrategicVisionController.prototype.addObjectiveLink,
      ),
    ).toEqual(['strategic_vision.manage_links']);
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSIONS_KEY,
        StrategicVisionController.prototype.removeObjectiveLink,
      ),
    ).toEqual(['strategic_vision.manage_links']);
  });

  it('permissions OR pour gestion des directions', () => {
    expect(
      Reflect.getMetadata(
        REQUIRE_ANY_PERMISSIONS_KEY,
        StrategicVisionController.prototype.createDirection,
      ),
    ).toEqual(['strategic_vision.update', 'strategic_vision.manage_directions']);
    expect(
      Reflect.getMetadata(
        REQUIRE_ANY_PERMISSIONS_KEY,
        StrategicVisionController.prototype.updateDirection,
      ),
    ).toEqual(['strategic_vision.update', 'strategic_vision.manage_directions']);
  });

  it('applique la chaîne de guards attendue au controller', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, StrategicVisionController);
    expect(guards).toEqual([
      JwtAuthGuard,
      ActiveClientGuard,
      ModuleAccessGuard,
      PermissionsGuard,
    ]);
  });
});

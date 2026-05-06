import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
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
    getVisionById: jest.fn(),
    getKpis: jest.fn(),
    getKpisByDirection: jest.fn(),
    getAlerts: jest.fn(),
    createVision: jest.fn(),
    updateVision: jest.fn(),
    archiveVision: jest.fn(),
    listAxes: jest.fn(),
    listAxesByVision: jest.fn(),
    getAxisById: jest.fn(),
    createAxis: jest.fn(),
    updateAxis: jest.fn(),
    archiveAxis: jest.fn(),
    listDirections: jest.fn(),
    createDirection: jest.fn(),
    updateDirection: jest.fn(),
    deleteDirection: jest.fn(),
    listObjectives: jest.fn(),
    listObjectivesByAxis: jest.fn(),
    getObjectiveById: jest.fn(),
    createObjective: jest.fn(),
    updateObjective: jest.fn(),
    archiveObjective: jest.fn(),
    listObjectiveLinks: jest.fn(),
    addObjectiveLink: jest.fn(),
    updateObjectiveLink: jest.fn(),
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

  it('listVisions transmet les filtres query au service', () => {
    const controller = new StrategicVisionController(
      serviceMock as unknown as StrategicVisionService,
    );
    const query = {
      status: 'ACTIVE',
      search: 'Vision 2026',
      includeArchived: true,
    } as const;

    controller.listVisions('c1', query);

    expect(serviceMock.listVisions).toHaveBeenCalledWith('c1', query);
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
    expect(
      Reflect.getMetadata(
        REQUIRE_ANY_PERMISSIONS_KEY,
        StrategicVisionController.prototype.deleteDirection,
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

  // ===================================================================
  // RFC-STRAT-007 — permissions, routes imbriquées, ordre des handlers
  // ===================================================================

  it('permissions strategic_vision.delete sur les DELETE archivage logique', () => {
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSIONS_KEY,
        StrategicVisionController.prototype.archiveVision,
      ),
    ).toEqual(['strategic_vision.delete']);
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSIONS_KEY,
        StrategicVisionController.prototype.archiveAxisNested,
      ),
    ).toEqual(['strategic_vision.delete']);
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSIONS_KEY,
        StrategicVisionController.prototype.archiveObjectiveNested,
      ),
    ).toEqual(['strategic_vision.delete']);
  });

  it('permissions strategic_vision.manage_links sur PATCH/POST/DELETE liens (nested)', () => {
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSIONS_KEY,
        StrategicVisionController.prototype.addObjectiveLinkNested,
      ),
    ).toEqual(['strategic_vision.manage_links']);
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSIONS_KEY,
        StrategicVisionController.prototype.updateObjectiveLinkNested,
      ),
    ).toEqual(['strategic_vision.manage_links']);
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSIONS_KEY,
        StrategicVisionController.prototype.removeObjectiveLinkNested,
      ),
    ).toEqual(['strategic_vision.manage_links']);
  });

  it('expose les routes RFC imbriquées (path metadata)', () => {
    const handlersByPath = collectHandlerRoutes(StrategicVisionController);

    expect(handlersByPath).toContainEqual(
      expect.objectContaining({
        path: 'strategic-vision/axes/:axisId/objectives',
        method: RequestMethod.GET,
      }),
    );
    expect(handlersByPath).toContainEqual(
      expect.objectContaining({
        path: 'strategic-vision/axes/:axisId/objectives',
        method: RequestMethod.POST,
      }),
    );
    expect(handlersByPath).toContainEqual(
      expect.objectContaining({
        path: 'strategic-vision/objectives/:objectiveId',
        method: RequestMethod.GET,
      }),
    );
    expect(handlersByPath).toContainEqual(
      expect.objectContaining({
        path: 'strategic-vision/objectives/:objectiveId',
        method: RequestMethod.PATCH,
      }),
    );
    expect(handlersByPath).toContainEqual(
      expect.objectContaining({
        path: 'strategic-vision/objectives/:objectiveId',
        method: RequestMethod.DELETE,
      }),
    );
    expect(handlersByPath).toContainEqual(
      expect.objectContaining({
        path: 'strategic-vision/objectives/:objectiveId/links',
        method: RequestMethod.GET,
      }),
    );
    expect(handlersByPath).toContainEqual(
      expect.objectContaining({
        path: 'strategic-vision/objectives/:objectiveId/links/:linkId',
        method: RequestMethod.PATCH,
      }),
    );
    expect(handlersByPath).toContainEqual(
      expect.objectContaining({
        path: 'strategic-vision/:visionId/axes',
        method: RequestMethod.POST,
      }),
    );
    expect(handlersByPath).toContainEqual(
      expect.objectContaining({
        path: 'strategic-vision/:visionId/axes/:axisId',
        method: RequestMethod.DELETE,
      }),
    );
    expect(handlersByPath).toContainEqual(
      expect.objectContaining({
        path: 'strategic-vision/:id',
        method: RequestMethod.DELETE,
      }),
    );
  });

  it("ordre des routes : les chemins spécifiques `axes` et `objectives` sont déclarés AVANT `strategic-vision/:id` pour ne pas être capturés", () => {
    const ordered = collectHandlerRoutes(StrategicVisionController);

    const idGetIndex = ordered.findIndex(
      (r) => r.path === 'strategic-vision/:id' && r.method === RequestMethod.GET,
    );
    const axesObjectivesIndex = ordered.findIndex(
      (r) =>
        r.path === 'strategic-vision/axes/:axisId/objectives' &&
        r.method === RequestMethod.GET,
    );
    const objectiveIndex = ordered.findIndex(
      (r) =>
        r.path === 'strategic-vision/objectives/:objectiveId' &&
        r.method === RequestMethod.GET,
    );

    expect(idGetIndex).toBeGreaterThan(-1);
    expect(axesObjectivesIndex).toBeGreaterThan(-1);
    expect(objectiveIndex).toBeGreaterThan(-1);
    expect(axesObjectivesIndex).toBeLessThan(idGetIndex);
    expect(objectiveIndex).toBeLessThan(idGetIndex);
  });
});

type RouteEntry = { handler: string; path: string; method: number };

function collectHandlerRoutes(target: { prototype: object }): RouteEntry[] {
  const proto = target.prototype as Record<string, unknown>;
  const out: RouteEntry[] = [];
  for (const key of Object.getOwnPropertyNames(proto)) {
    if (key === 'constructor') continue;
    const fn = proto[key];
    if (typeof fn !== 'function') continue;
    const path = Reflect.getMetadata(PATH_METADATA, fn);
    const method = Reflect.getMetadata(METHOD_METADATA, fn);
    if (path === undefined || method === undefined) continue;
    out.push({ handler: key, path, method });
  }
  return out;
}

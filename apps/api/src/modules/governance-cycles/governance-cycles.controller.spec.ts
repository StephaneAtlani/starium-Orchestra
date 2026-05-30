import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test } from '@nestjs/testing';
import { REQUIRE_ANY_PERMISSIONS_KEY } from '../../common/decorators/require-any-permissions.decorator';
import { REQUIRE_PERMISSIONS_KEY } from '../../common/decorators/require-permissions.decorator';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateGovernanceCycleDto } from './dto/create-governance-cycle.dto';
import { GovernanceCyclesController } from './governance-cycles.controller';
import { GovernanceCyclesService } from './governance-cycles.service';

const passGuard = { canActivate: () => true };

describe('GovernanceCyclesController', () => {
  const serviceMock = {
    listCycles: jest.fn(),
    getCycleById: jest.fn(),
    createCycle: jest.fn(),
    updateCycle: jest.fn(),
    archiveCycle: jest.fn(),
    listItems: jest.fn(),
    createItem: jest.fn(),
    getItemById: jest.fn(),
    updateItem: jest.fn(),
    deleteItem: jest.fn(),
  };

  beforeEach(async () => {
    await Test.createTestingModule({
      controllers: [GovernanceCyclesController],
      providers: [{ provide: GovernanceCyclesService, useValue: serviceMock }],
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

  it('applique les guards standards sur le controller', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, GovernanceCyclesController) as unknown[];
    expect(guards).toEqual(
      expect.arrayContaining([
        JwtAuthGuard,
        ActiveClientGuard,
        ModuleAccessGuard,
        PermissionsGuard,
      ]),
    );
  });

  it('permissions governance_cycles.read sur GET', () => {
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSIONS_KEY,
        GovernanceCyclesController.prototype.listCycles,
      ),
    ).toEqual(['governance_cycles.read']);
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSIONS_KEY,
        GovernanceCyclesController.prototype.getCycle,
      ),
    ).toEqual(['governance_cycles.read']);
  });

  it('permissions create / update / delete', () => {
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSIONS_KEY,
        GovernanceCyclesController.prototype.createCycle,
      ),
    ).toEqual(['governance_cycles.create']);
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSIONS_KEY,
        GovernanceCyclesController.prototype.updateCycle,
      ),
    ).toEqual(['governance_cycles.update']);
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSIONS_KEY,
        GovernanceCyclesController.prototype.archiveCycle,
      ),
    ).toEqual(['governance_cycles.delete']);
  });

  it('listCycles transmet clientId et query au service', async () => {
    const controller = new GovernanceCyclesController(serviceMock as unknown as GovernanceCyclesService);
    serviceMock.listCycles.mockResolvedValue({
      items: [],
      total: 0,
      limit: 20,
      offset: 0,
    });

    const result = await controller.listCycles('client-a', {
      search: 'CODIR',
      limit: 10,
      offset: 5,
    });

    expect(serviceMock.listCycles).toHaveBeenCalledWith('client-a', {
      search: 'CODIR',
      limit: 10,
      offset: 5,
    });
    expect(result).toEqual({ items: [], total: 0, limit: 20, offset: 0 });
  });

  it('createCycle ne reçoit pas clientId dans le DTO', () => {
    const dtoKeys = Reflect.getMetadata(
      'design:paramtypes',
      GovernanceCyclesController.prototype,
      'createCycle',
    );
    expect(dtoKeys?.[1]).toBe(CreateGovernanceCycleDto);
    expect(CreateGovernanceCycleDto.prototype).not.toHaveProperty('clientId');
  });

  it('permissions items read / create / update', () => {
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSIONS_KEY,
        GovernanceCyclesController.prototype.listItems,
      ),
    ).toEqual(['governance_cycles.read']);
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSIONS_KEY,
        GovernanceCyclesController.prototype.createItem,
      ),
    ).toEqual(['governance_cycles.create']);
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSIONS_KEY,
        GovernanceCyclesController.prototype.deleteItem,
      ),
    ).toEqual(['governance_cycles.update']);
  });

  it('patchItem utilise RequireAnyPermissions update ou arbitrate', () => {
    expect(
      Reflect.getMetadata(
        REQUIRE_ANY_PERMISSIONS_KEY,
        GovernanceCyclesController.prototype.patchItem,
      ),
    ).toEqual(['governance_cycles.update', 'governance_cycles.arbitrate']);
  });

  it('deleteItem délègue au service (204)', async () => {
    const controller = new GovernanceCyclesController(serviceMock as unknown as GovernanceCyclesService);
    serviceMock.deleteItem.mockResolvedValue(undefined);

    const result = await controller.deleteItem(
      'client-a',
      'cycle-1',
      'item-1',
      'user-1',
      {},
    );

    expect(result).toBeUndefined();
    expect(serviceMock.deleteItem).toHaveBeenCalledWith(
      'client-a',
      'cycle-1',
      'item-1',
      expect.objectContaining({ actorUserId: 'user-1' }),
    );
  });

  it('archiveCycle délègue au service (DELETE → 204 No Content côté controller)', async () => {
    const controller = new GovernanceCyclesController(serviceMock as unknown as GovernanceCyclesService);
    serviceMock.archiveCycle.mockResolvedValue(undefined);

    const result = await controller.archiveCycle('client-a', 'cycle-1', 'user-1', {});

    expect(result).toBeUndefined();
    expect(serviceMock.archiveCycle).toHaveBeenCalledWith(
      'client-a',
      'cycle-1',
      expect.objectContaining({ actorUserId: 'user-1' }),
    );
    expect(
      Reflect.getMetadata(
        '__httpCode__',
        GovernanceCyclesController.prototype.archiveCycle,
      ) ?? 204,
    ).toBe(204);
  });
});

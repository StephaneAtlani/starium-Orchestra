import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { REQUIRE_PERMISSIONS_KEY } from '../../../common/decorators/require-permissions.decorator';
import { ActiveClientGuard } from '../../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { MeetingTemplatesController } from '../meeting-templates.controller';
import { MeetingsController } from '../meetings.controller';

const permissionsOf = (target: object) =>
  Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, target) as string[] | undefined;

const EXPECTED_CHAIN = [
  JwtAuthGuard,
  ActiveClientGuard,
  ModuleAccessGuard,
  PermissionsGuard,
];

describe('MeetingsController — guards et permissions (RFC-MEET-001 §4.10)', () => {
  it('applique la chaîne de guards canonique', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, MeetingsController) as unknown[],
    ).toEqual(EXPECTED_CHAIN);
  });

  it('protège chaque route par une permission explicite', () => {
    const proto = MeetingsController.prototype as unknown as Record<
      string,
      object
    >;
    const handlers = Object.getOwnPropertyNames(proto).filter(
      (name) => name !== 'constructor',
    );
    expect(handlers.length).toBeGreaterThan(0);
    for (const name of handlers) {
      expect(permissionsOf(proto[name])).toBeDefined();
    }
  });

  it('n’exige que la lecture pour consulter', () => {
    const proto = MeetingsController.prototype;
    expect(permissionsOf(proto.list)).toEqual(['meetings.read']);
    expect(permissionsOf(proto.get)).toEqual(['meetings.read']);
    expect(permissionsOf(proto.attendance)).toEqual(['meetings.read']);
  });

  it('exige meetings.create pour créer une réunion', () => {
    expect(permissionsOf(MeetingsController.prototype.create)).toEqual([
      'meetings.create',
    ]);
  });

  it('exige meetings.update pour la préparation et la convocation', () => {
    const proto = MeetingsController.prototype;
    for (const handler of [
      proto.update,
      proto.schedule,
      proto.cancel,
      proto.addProjects,
      proto.removeProject,
      proto.reorderProjects,
      proto.updateProject,
      proto.reorderSections,
      proto.updateSection,
    ]) {
      expect(permissionsOf(handler)).toEqual(['meetings.update']);
    }
  });

  it('réserve la conduite de séance à meetings.conduct', () => {
    const proto = MeetingsController.prototype;
    expect(permissionsOf(proto.start)).toEqual(['meetings.conduct']);
    expect(permissionsOf(proto.finalize)).toEqual(['meetings.conduct']);
  });
});

describe('MeetingTemplatesController — guards et permissions', () => {
  it('applique la chaîne de guards canonique', () => {
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        MeetingTemplatesController,
      ) as unknown[],
    ).toEqual(EXPECTED_CHAIN);
  });

  it('protège chaque route par une permission explicite', () => {
    const proto = MeetingTemplatesController.prototype as unknown as Record<
      string,
      object
    >;
    const handlers = Object.getOwnPropertyNames(proto).filter(
      (name) => name !== 'constructor',
    );
    expect(handlers.length).toBeGreaterThan(0);
    for (const name of handlers) {
      expect(permissionsOf(proto[name])).toBeDefined();
    }
  });

  it('laisse lire le catalogue et les modèles avec meetings.read', () => {
    const proto = MeetingTemplatesController.prototype;
    expect(permissionsOf(proto.sectionCatalog)).toEqual(['meetings.read']);
    expect(permissionsOf(proto.list)).toEqual(['meetings.read']);
    expect(permissionsOf(proto.get)).toEqual(['meetings.read']);
  });

  it('réserve toute modification de modèle à meetings.templates.manage', () => {
    const proto = MeetingTemplatesController.prototype;
    for (const handler of [
      proto.create,
      proto.update,
      proto.remove,
      proto.duplicate,
      proto.putSections,
    ]) {
      expect(permissionsOf(handler)).toEqual(['meetings.templates.manage']);
    }
  });
});

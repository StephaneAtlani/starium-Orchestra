import { MeetingSectionType } from '@prisma/client';
import {
  MEETING_SECTION_CATALOG,
  MEETING_SECTION_TYPES,
  findDuplicateNonRepeatableSections,
  isRepeatableSection,
  meetingSectionDefaultTitle,
} from './meeting-section-catalog';
import { SYSTEM_MEETING_TEMPLATES } from './system-meeting-templates';

describe('catalogue des sections', () => {
  it('couvre exhaustivement l’enum Prisma MeetingSectionType', () => {
    // Garde-fou : ajouter une valeur à l'enum sans l'inscrire au catalogue
    // casserait le rendu et les exports (RFC-MEET-001 §4.2).
    const fromEnum = Object.values(MeetingSectionType) as MeetingSectionType[];
    expect([...MEETING_SECTION_TYPES].sort()).toEqual([...fromEnum].sort());
  });

  it('donne un libellé métier à chaque section, jamais un identifiant', () => {
    for (const type of MEETING_SECTION_TYPES) {
      const title = meetingSectionDefaultTitle(type);
      expect(title.length).toBeGreaterThan(0);
      expect(title).not.toBe(type);
    }
  });

  it('ne rend répétable que le bloc libre', () => {
    const repeatable = MEETING_SECTION_TYPES.filter(isRepeatableSection);
    expect(repeatable).toEqual(['FREE_TEXT']);
  });

  it('marque comme agrégeantes les sections qui lisent d’autres modules', () => {
    expect(MEETING_SECTION_CATALOG.PLANNING_MACRO.aggregatesExternalData).toBe(
      true,
    );
    expect(MEETING_SECTION_CATALOG.BUDGET_CONSUMPTION.aggregatesExternalData).toBe(
      true,
    );
    // Ces sections ne restituent que des données propres au module.
    expect(MEETING_SECTION_CATALOG.ATTENDANCE.aggregatesExternalData).toBe(false);
    expect(MEETING_SECTION_CATALOG.DECISIONS.aggregatesExternalData).toBe(false);
    expect(MEETING_SECTION_CATALOG.FREE_TEXT.aggregatesExternalData).toBe(false);
  });
});

describe('validation d’une composition de sections', () => {
  it('accepte une composition sans doublon', () => {
    expect(
      findDuplicateNonRepeatableSections(['COVER', 'ATTENDANCE', 'DECISIONS']),
    ).toEqual([]);
  });

  it('refuse un doublon sur une section non répétable', () => {
    expect(findDuplicateNonRepeatableSections(['RISKS', 'COVER', 'RISKS'])).toEqual(
      ['RISKS'],
    );
  });

  it('accepte plusieurs blocs libres — c’est l’échappatoire produit', () => {
    expect(
      findDuplicateNonRepeatableSections(['FREE_TEXT', 'FREE_TEXT', 'FREE_TEXT']),
    ).toEqual([]);
  });
});

describe('modèles système', () => {
  it('ne compose qu’avec des sections du catalogue', () => {
    for (const template of SYSTEM_MEETING_TEMPLATES) {
      for (const section of template.sections) {
        expect(MEETING_SECTION_CATALOG[section]).toBeDefined();
      }
    }
  });

  it('ne comporte aucun doublon interdit', () => {
    for (const template of SYSTEM_MEETING_TEMPLATES) {
      expect(findDuplicateNonRepeatableSections(template.sections)).toEqual([]);
    }
  });

  it('ouvre chaque rituel par la couverture puis l’appel', () => {
    for (const template of SYSTEM_MEETING_TEMPLATES) {
      expect(template.sections[0]).toBe('COVER');
      expect(template.sections[1]).toBe('ATTENDANCE');
    }
  });

  it('n’affecte de sections projet qu’aux modèles qui portent un projet', () => {
    for (const template of SYSTEM_MEETING_TEMPLATES) {
      if (template.scope === 'PORTFOLIO') continue;
      // Un modèle de portée PROJECT doit restituer au moins une donnée projet.
      const hasProjectSection = template.sections.some(
        (section) => MEETING_SECTION_CATALOG[section].requiresProjectScope,
      );
      expect(hasProjectSection).toBe(true);
    }
  });

  it('donne à chaque modèle un ordre du jour par défaut non vide', () => {
    for (const template of SYSTEM_MEETING_TEMPLATES) {
      expect(template.defaultAgenda.length).toBeGreaterThan(0);
      for (const row of template.defaultAgenda) {
        expect(row.title.trim().length).toBeGreaterThan(0);
      }
    }
  });
});

import { BadRequestException } from '@nestjs/common';
import {
  assertProcedureContentJson,
  isProcedureContentEmpty,
  sanitizeProcedureHtml,
} from '../lib/procedure-content.util';

describe('assertProcedureContentJson (v2 blocks)', () => {
  it('accepte un document blocs minimal', () => {
    const doc = {
      schemaVersion: 2,
      blocks: [
        { t: 'h1', html: 'Objet' },
        { t: 'p', html: 'Texte <b>gras</b>' },
      ],
    };
    expect(assertProcedureContentJson(doc)).toEqual(doc);
  });

  it('refuse TipTap type doc', () => {
    expect(() =>
      assertProcedureContentJson({
        type: 'doc',
        content: [{ type: 'paragraph' }],
      }),
    ).toThrow(BadRequestException);
  });

  it('refuse javascript: dans un lien', () => {
    expect(() =>
      assertProcedureContentJson({
        schemaVersion: 2,
        blocks: [
          {
            t: 'p',
            html: '<a href="javascript:alert(1)">x</a>',
          },
        ],
      }),
    ).toThrow(BadRequestException);
  });

  it('accepte image avec assetId + alt', () => {
    const doc = {
      schemaVersion: 2,
      blocks: [
        {
          t: 'img',
          assetId: 'clxxxxxxxx0001asset00001',
          alt: 'Schéma',
          cap: '',
        },
      ],
    };
    const out = assertProcedureContentJson(doc);
    expect((out.blocks as unknown[])[0]).toMatchObject({
      t: 'img',
      assetId: 'clxxxxxxxx0001asset00001',
    });
  });

  it('accepte diag avec nodes/edges', () => {
    const doc = {
      schemaVersion: 2,
      blocks: [
        {
          t: 'diag',
          title: 'Flux',
          cap: '',
          nodes: [
            { id: 'n1', k: 'start', x: 10, y: 10, label: 'Début' },
            { id: 'n2', k: 'end', x: 100, y: 10, label: 'Fin' },
          ],
          edges: [{ from: 'n1', to: 'n2' }],
        },
      ],
    };
    expect(assertProcedureContentJson(doc).blocks).toHaveLength(1);
  });
});

describe('sanitizeProcedureHtml', () => {
  it('retire style et script', () => {
    expect(
      sanitizeProcedureHtml('<p style="color:red">x</p><script>evil()</script>'),
    ).toBe('x');
  });

  it('conserve strong et lien https', () => {
    expect(
      sanitizeProcedureHtml('<strong>ok</strong> <a href="https://ex.com">l</a>'),
    ).toBe('<strong>ok</strong> <a href="https://ex.com">l</a>');
  });
});

describe('isProcedureContentEmpty', () => {
  it('détecte EMPTY_V2', () => {
    expect(
      isProcedureContentEmpty({
        schemaVersion: 2,
        blocks: [
          { t: 'h1', html: '' },
          { t: 'p', html: '' },
        ],
      }),
    ).toBe(true);
  });

  it('détecte contenu non vide', () => {
    expect(
      isProcedureContentEmpty({
        schemaVersion: 2,
        blocks: [{ t: 'p', html: 'Hello' }],
      }),
    ).toBe(false);
  });
});

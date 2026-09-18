import { BadRequestException } from '@nestjs/common';
import { assertProcedureContentJson } from '../lib/procedure-content.util';

describe('assertProcedureContentJson', () => {
  it('accepte un doc TipTap minimal', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello', marks: [{ type: 'bold' }] }],
        },
      ],
    };
    expect(assertProcedureContentJson(doc)).toEqual(doc);
  });

  it('accepte H6, underline, textStyle et highlight tokenisés', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 6 },
          content: [
            {
              type: 'text',
              text: 'Titre',
              marks: [
                { type: 'underline' },
                { type: 'textStyle', attrs: { colorToken: 'brand' } },
                { type: 'highlight', attrs: { colorToken: 'warningSoft' } },
              ],
            },
          ],
        },
        { type: 'horizontalRule' },
        {
          type: 'codeBlock',
          attrs: { language: 'bash' },
          content: [{ type: 'text', text: 'echo ok' }],
        },
      ],
    };
    expect(assertProcedureContentJson(doc)).toEqual(doc);
  });

  it('accepte procedureImage et procedureFile avec alt/label', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'procedureImage',
          attrs: { assetId: 'clxxxxxxxx0001asset00001', alt: 'Schéma accès' },
        },
        {
          type: 'procedureFile',
          attrs: {
            assetId: 'clxxxxxxxx0001asset00002',
            label: 'Annexe PDF',
          },
        },
      ],
    };
    expect(assertProcedureContentJson(doc)).toEqual(doc);
  });

  it('refuse procedureImage sans alt', () => {
    expect(() =>
      assertProcedureContentJson({
        type: 'doc',
        content: [
          {
            type: 'procedureImage',
            attrs: { assetId: 'clxxxxxxxx0001asset00001', alt: '' },
          },
        ],
      }),
    ).toThrow(BadRequestException);
  });

  it('refuse H7', () => {
    expect(() =>
      assertProcedureContentJson({
        type: 'doc',
        content: [{ type: 'heading', attrs: { level: 7 } }],
      }),
    ).toThrow(BadRequestException);
  });

  it('refuse un colorToken texte inconnu', () => {
    expect(() =>
      assertProcedureContentJson({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'x',
                marks: [
                  { type: 'textStyle', attrs: { colorToken: '#ff0000' } },
                ],
              },
            ],
          },
        ],
      }),
    ).toThrow(BadRequestException);
  });

  it('refuse une couleur CSS libre sur textStyle', () => {
    expect(() =>
      assertProcedureContentJson({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'x',
                marks: [
                  {
                    type: 'textStyle',
                    attrs: { color: 'var(--brand-ink)' },
                  },
                ],
              },
            ],
          },
        ],
      }),
    ).toThrow(BadRequestException);
  });

  it('refuse un script / noeud inconnu', () => {
    expect(() =>
      assertProcedureContentJson({
        type: 'doc',
        content: [{ type: 'script' }],
      }),
    ).toThrow(BadRequestException);
  });

  it('refuse un lien non https', () => {
    expect(() =>
      assertProcedureContentJson({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'x',
                marks: [{ type: 'link', attrs: { href: 'http://evil' } }],
              },
            ],
          },
        ],
      }),
    ).toThrow(BadRequestException);
  });
});

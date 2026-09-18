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

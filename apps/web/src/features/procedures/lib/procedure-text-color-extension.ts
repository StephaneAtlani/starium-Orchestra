import { Extension } from '@tiptap/core';
import {
  PROCEDURE_TEXT_COLOR_CSS,
  type ProcedureTextColorToken,
} from './procedure-color-tokens';

declare module '@tiptap/core' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Commands<ReturnType> {
    procedureTextColor: {
      setProcedureTextColor: (token: ProcedureTextColorToken) => ReturnType;
      unsetProcedureTextColor: () => ReturnType;
    };
  }
}

/** Stocke `colorToken` (allowlist) sur le mark textStyle — pas de hex libre. */
export const ProcedureTextColor = Extension.create({
  name: 'procedureTextColor',

  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          colorToken: {
            default: null,
            parseHTML: (element: HTMLElement) =>
              element.getAttribute('data-color-token'),
            renderHTML: (attributes: { colorToken?: string | null }) => {
              const token = attributes.colorToken;
              if (!token || !PROCEDURE_TEXT_COLOR_CSS[token]) {
                return {};
              }
              return {
                'data-color-token': token,
                style: `color: ${PROCEDURE_TEXT_COLOR_CSS[token]}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setProcedureTextColor:
        (token: ProcedureTextColorToken) =>
        ({ chain }) => {
          if (!PROCEDURE_TEXT_COLOR_CSS[token]) return false;
          return chain().setMark('textStyle', { colorToken: token }).run();
        },
      unsetProcedureTextColor:
        () =>
        ({ chain }) =>
          chain()
            .setMark('textStyle', { colorToken: null })
            .removeEmptyTextStyle()
            .run(),
    };
  },
});

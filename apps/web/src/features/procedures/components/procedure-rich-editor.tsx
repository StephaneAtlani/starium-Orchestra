import Highlight from '@tiptap/extension-highlight';
import { Content, EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { LoadingState } from '@/components/feedback/loading-state';
import { cn } from '@/lib/utils';
import { EMPTY_PROCEDURE_DOC } from '../lib/procedure-content';
import { PROCEDURE_HIGHLIGHT_COLOR_CSS } from '../lib/procedure-color-tokens';
import { ProcedureTextColor } from '../lib/procedure-text-color-extension';
import { ProcedureEditorToolbar } from './procedure-editor-toolbar';

type Props = {
  content: Content | null | undefined;
  editable: boolean;
  onChange?: (json: Record<string, unknown>) => void;
  className?: string;
};

const ProcedureHighlight = Highlight.extend({
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element) =>
          element.getAttribute('data-color') ||
          element.getAttribute('data-color-token'),
        renderHTML: (attributes) => {
          const token = attributes.color as string | null;
          if (!token || !PROCEDURE_HIGHLIGHT_COLOR_CSS[token]) {
            return {};
          }
          return {
            'data-color': token,
            'data-color-token': token,
            style: `background-color: ${PROCEDURE_HIGHLIGHT_COLOR_CSS[token]}`,
          };
        },
      },
    };
  },
}).configure({ multicolor: true });

export function ProcedureRichEditor({
  content,
  editable,
  onChange,
  className,
}: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
      }),
      TextStyle,
      Underline,
      ProcedureTextColor,
      ProcedureHighlight,
      Link.configure({
        openOnClick: false,
        autolink: true,
        protocols: ['https'],
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
          class: 'text-[var(--brand-gold-700)] underline underline-offset-2',
        },
      }),
    ],
    content: (content as Content) ?? EMPTY_PROCEDURE_DOC,
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        id: 'procedure-rich-editor-content',
        class:
          'prose prose-sm max-w-none min-h-[12rem] px-3 py-3 focus:outline-none text-foreground prose-headings:font-semibold prose-headings:tracking-tight',
        'aria-label': 'Contenu de la procédure',
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange?.(ed.getJSON() as Record<string, unknown>);
    },
  });

  if (!editor) {
    return (
      <div
        className={cn(
          'rounded-[var(--radius-lg)] border border-border/70 bg-card p-4',
          className,
        )}
        aria-live="polite"
      >
        <LoadingState rows={2} />
      </div>
    );
  }

  const setLink = () => {
    if (!editable) return;
    const previous = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('URL du lien (https://…)', previous ?? 'https://');
    if (url === null) return;
    const trimmed = url.trim();
    if (!trimmed) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    if (!/^https:\/\//i.test(trimmed)) {
      window.alert('Seules les URL https:// sont autorisées.');
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: trimmed })
      .run();
  };

  return (
    <div
      className={cn(
        'overflow-hidden rounded-[var(--radius-lg)] border border-border/70 bg-card',
        className,
      )}
    >
      {editable ? (
        <ProcedureEditorToolbar editor={editor} onRequestLink={setLink} />
      ) : null}
      <EditorContent editor={editor} />
    </div>
  );
}

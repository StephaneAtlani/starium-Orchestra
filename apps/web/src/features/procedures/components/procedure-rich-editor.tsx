import { Content, EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import type { ReactNode } from 'react';
import {
  Bold,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { EMPTY_PROCEDURE_DOC } from '../lib/procedure-content';

type Props = {
  content: Content | null | undefined;
  editable: boolean;
  onChange?: (json: Record<string, unknown>) => void;
  className?: string;
};

export function ProcedureRichEditor({
  content,
  editable,
  onChange,
  className,
}: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
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
        class:
          'prose prose-sm max-w-none min-h-[12rem] px-3 py-3 focus:outline-none text-foreground',
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
          'rounded-[var(--radius-lg)] border border-border/70 bg-card p-4 text-sm text-muted-foreground',
          className,
        )}
      >
        Chargement de l&apos;éditeur…
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
        <div
          className="flex flex-wrap gap-1 border-b border-border/70 bg-muted/30 p-2"
          role="toolbar"
          aria-label="Mise en forme"
        >
          <ToolbarButton
            label="Gras"
            pressed={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
            icon={<Bold className="size-4" aria-hidden />}
          />
          <ToolbarButton
            label="Italique"
            pressed={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            icon={<Italic className="size-4" aria-hidden />}
          />
          <ToolbarButton
            label="Titre"
            pressed={editor.isActive('heading', { level: 2 })}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            icon={<Heading2 className="size-4" aria-hidden />}
          />
          <ToolbarButton
            label="Liste à puces"
            pressed={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            icon={<List className="size-4" aria-hidden />}
          />
          <ToolbarButton
            label="Liste numérotée"
            pressed={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            icon={<ListOrdered className="size-4" aria-hidden />}
          />
          <ToolbarButton
            label="Citation"
            pressed={editor.isActive('blockquote')}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            icon={<Quote className="size-4" aria-hidden />}
          />
          <ToolbarButton
            label="Lien"
            pressed={editor.isActive('link')}
            onClick={setLink}
            icon={<Link2 className="size-4" aria-hidden />}
          />
        </div>
      ) : null}
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({
  label,
  pressed,
  onClick,
  icon,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
  icon: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant={pressed ? 'default' : 'outline'}
      size="icon"
      className="min-h-11 min-w-11 sm:min-h-9 sm:min-w-9"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
    >
      {icon}
    </Button>
  );
}

import type { Editor } from '@tiptap/react';
import type { ReactNode } from 'react';
import {
  Bold,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  Highlighter,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Palette,
  Quote,
  Strikethrough,
  Underline as UnderlineIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  PROCEDURE_HIGHLIGHT_COLOR_OPTIONS,
  PROCEDURE_TEXT_COLOR_OPTIONS,
  type ProcedureHighlightColorToken,
  type ProcedureTextColorToken,
} from '../lib/procedure-color-tokens';

type Props = {
  editor: Editor;
  onRequestLink: () => void;
};

const HEADING_LEVELS = [
  { level: 1 as const, label: 'Titre 1', Icon: Heading1 },
  { level: 2 as const, label: 'Titre 2', Icon: Heading2 },
  { level: 3 as const, label: 'Titre 3', Icon: Heading3 },
  { level: 4 as const, label: 'Titre 4', Icon: Heading4 },
  { level: 5 as const, label: 'Titre 5', Icon: Heading5 },
  { level: 6 as const, label: 'Titre 6', Icon: Heading6 },
];

export function ProcedureEditorToolbar({ editor, onRequestLink }: Props) {
  const textToken =
    (editor.getAttributes('textStyle').colorToken as string | null) ?? '';
  const highlightToken =
    (editor.getAttributes('highlight').color as string | null) ?? '';

  return (
    <div
      className="flex max-w-full flex-wrap items-center gap-1 overflow-x-auto border-b border-border/70 bg-muted/30 p-2"
      role="toolbar"
      aria-label="Mise en forme de la procédure"
      aria-controls="procedure-rich-editor-content"
    >
      <ToolbarGroup label="Structure">
        {HEADING_LEVELS.map(({ level, label, Icon }) => (
          <ToolbarButton
            key={level}
            label={label}
            pressed={editor.isActive('heading', { level })}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level }).run()
            }
            icon={<Icon className="size-4" aria-hidden />}
          />
        ))}
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
          label="Bloc de code"
          pressed={editor.isActive('codeBlock')}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          icon={<Code2 className="size-4" aria-hidden />}
        />
        <ToolbarButton
          label="Séparateur"
          pressed={false}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          icon={<Minus className="size-4" aria-hidden />}
        />
      </ToolbarGroup>

      <ToolbarGroup label="Inline">
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
          label="Souligné"
          pressed={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          icon={<UnderlineIcon className="size-4" aria-hidden />}
        />
        <ToolbarButton
          label="Barré"
          pressed={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          icon={<Strikethrough className="size-4" aria-hidden />}
        />
        <ToolbarButton
          label="Lien"
          pressed={editor.isActive('link')}
          onClick={onRequestLink}
          icon={<Link2 className="size-4" aria-hidden />}
        />
      </ToolbarGroup>

      <ToolbarGroup label="Couleur">
        <div className="flex min-h-11 items-center gap-1 sm:min-h-9">
          <Palette className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <label className="sr-only" htmlFor="procedure-text-color">
            Couleur du texte
          </label>
          <Select
            value={textToken || '__none__'}
            onValueChange={(v) => {
              const next = v ?? '__none__';
              if (next === '__none__') {
                editor.chain().focus().unsetProcedureTextColor().run();
                return;
              }
              editor
                .chain()
                .focus()
                .setProcedureTextColor(next as ProcedureTextColorToken)
                .run();
            }}
          >
            <SelectTrigger
              id="procedure-text-color"
              className="h-11 min-w-[8.5rem] sm:h-9"
              aria-label="Couleur du texte"
            >
              <SelectValue>
                {textToken
                  ? (PROCEDURE_TEXT_COLOR_OPTIONS.find((o) => o.token === textToken)
                      ?.label ?? 'Couleur texte')
                  : 'Couleur texte'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Aucune</SelectItem>
              {PROCEDURE_TEXT_COLOR_OPTIONS.map((o) => (
                <SelectItem key={o.token} value={o.token}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex min-h-11 items-center gap-1 sm:min-h-9">
          <Highlighter
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <label className="sr-only" htmlFor="procedure-highlight-color">
            Surlignage
          </label>
          <Select
            value={highlightToken || '__none__'}
            onValueChange={(v) => {
              const next = v ?? '__none__';
              if (next === '__none__') {
                editor.chain().focus().unsetHighlight().run();
                return;
              }
              editor
                .chain()
                .focus()
                .toggleHighlight({
                  color: next as ProcedureHighlightColorToken,
                })
                .run();
            }}
          >
            <SelectTrigger
              id="procedure-highlight-color"
              className="h-11 min-w-[9rem] sm:h-9"
              aria-label="Surlignage"
            >
              <SelectValue>
                {highlightToken
                  ? (PROCEDURE_HIGHLIGHT_COLOR_OPTIONS.find(
                      (o) => o.token === highlightToken,
                    )?.label ?? 'Surlignage')
                  : 'Surlignage'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Aucun</SelectItem>
              {PROCEDURE_HIGHLIGHT_COLOR_OPTIONS.map((o) => (
                <SelectItem key={o.token} value={o.token}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </ToolbarGroup>
    </div>
  );
}

function ToolbarGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-1 border-r border-border/60 pr-2 last:border-r-0 last:pr-0"
      role="group"
      aria-label={label}
    >
      <span className="starium-overline sr-only sm:not-sr-only sm:mr-1">
        {label}
      </span>
      {children}
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

export function procedureToolbarClassName(extra?: string) {
  return cn(extra);
}

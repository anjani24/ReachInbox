"use client";

import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import {
  AlignCenter, AlignLeft, Bold, Italic, List, ListOrdered, Quote,
  Redo2, Strikethrough, Type, Underline, Undo2, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

interface RichTextEditorProps {
  onChange: (html: string, isEmpty: boolean) => void;
}

export function RichTextEditor({ onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit, TextAlign.configure({ types: ["heading", "paragraph"] })],
    immediatelyRender: false, // avoids a Next.js hydration warning
    editorProps: {
      attributes: { class: "rich-text min-h-[300px] px-5 py-4 text-sm outline-none" },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML(), editor.isEmpty),
  });

  const isEmpty = useEditorState({ editor, selector: (ctx) => ctx.editor?.isEmpty ?? true });

  return (
    <div className="rounded-xl bg-surface p-3">
      <EditorToolbar editor={editor} />
      <div className="relative">
        {isEmpty && (
          <p className="pointer-events-none absolute left-5 top-4 text-sm text-muted">Type Your Reply...</p>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function EditorToolbar({ editor }: { editor: Editor | null }) {
  // Re-renders the toolbar when the selection changes, so active buttons highlight
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e?.isActive("bold") ?? false,
      italic: e?.isActive("italic") ?? false,
      underline: e?.isActive("underline") ?? false,
      strike: e?.isActive("strike") ?? false,
      heading: e?.isActive("heading", { level: 2 }) ?? false,
      alignLeft: e?.isActive({ textAlign: "left" }) ?? false,
      alignCenter: e?.isActive({ textAlign: "center" }) ?? false,
      bulletList: e?.isActive("bulletList") ?? false,
      orderedList: e?.isActive("orderedList") ?? false,
      blockquote: e?.isActive("blockquote") ?? false,
      canUndo: e?.can().undo() ?? false,
      canRedo: e?.can().redo() ?? false,
    }),
  });

  if (!editor || !state) return null;
  const run = () => editor.chain().focus();

  return (
    <div className="mb-2 flex flex-wrap items-center gap-0.5 rounded-lg bg-white px-2 py-1">
      <ToolButton icon={Undo2} label="Undo" disabled={!state.canUndo} onClick={() => run().undo().run()} />
      <ToolButton icon={Redo2} label="Redo" disabled={!state.canRedo} onClick={() => run().redo().run()} />
      <Divider />
      <ToolButton icon={Type} label="Heading" active={state.heading} onClick={() => run().toggleHeading({ level: 2 }).run()} />
      <ToolButton icon={Bold} label="Bold" active={state.bold} onClick={() => run().toggleBold().run()} />
      <ToolButton icon={Italic} label="Italic" active={state.italic} onClick={() => run().toggleItalic().run()} />
      <ToolButton icon={Underline} label="Underline" active={state.underline} onClick={() => run().toggleUnderline().run()} />
      <Divider />
      <ToolButton icon={AlignLeft} label="Align left" active={state.alignLeft} onClick={() => run().setTextAlign("left").run()} />
      <ToolButton icon={AlignCenter} label="Align center" active={state.alignCenter} onClick={() => run().setTextAlign("center").run()} />
      <Divider />
      <ToolButton icon={List} label="Bullet list" active={state.bulletList} onClick={() => run().toggleBulletList().run()} />
      <ToolButton icon={ListOrdered} label="Numbered list" active={state.orderedList} onClick={() => run().toggleOrderedList().run()} />
      <ToolButton icon={Quote} label="Quote" active={state.blockquote} onClick={() => run().toggleBlockquote().run()} />
      <Divider />
      <ToolButton icon={Strikethrough} label="Strikethrough" active={state.strike} onClick={() => run().toggleStrike().run()} />
    </div>
  );
}

interface ToolButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}

function ToolButton({ icon: Icon, label, onClick, active, disabled }: ToolButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()} // keeps the text selection while clicking
      onClick={onClick}
      className={cn(
        "rounded p-1.5 text-muted transition-colors hover:bg-surface hover:text-ink disabled:opacity-40",
        active && "bg-surface text-ink",
      )}
    >
      <Icon className="size-4" />
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-4 w-px bg-line" />;
}
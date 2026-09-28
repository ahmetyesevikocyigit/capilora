"use client";
import { useEditor, useEditorState, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExtension from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import { useState } from "react";
import { Modal } from "./modal";
import { MediaLibrary } from "./media";
import type { RichNode } from "@/lib/cms/types";
export function RichEditor({
  value,
  onChange,
}: {
  value: RichNode;
  onChange: (body: RichNode) => void;
}) {
  const [media, setMedia] = useState(false);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        codeBlock: false,
        code: false,
        link: { openOnClick: false },
      }),
      ImageExtension,
      TableKit,
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getJSON() as RichNode),
    editorProps: {
      attributes: { "aria-label": "Makale içeriği", role: "textbox" },
    },
  });
  const active = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor?.isActive("bold") ?? false,
      italic: editor?.isActive("italic") ?? false,
      underline: editor?.isActive("underline") ?? false,
      heading: editor?.isActive("heading", { level: 2 }) ?? false,
      subheading: editor?.isActive("heading", { level: 3 }) ?? false,
      paragraph: editor?.isActive("paragraph") ?? false,
      bulletList: editor?.isActive("bulletList") ?? false,
      orderedList: editor?.isActive("orderedList") ?? false,
      blockquote: editor?.isActive("blockquote") ?? false,
      link: editor?.isActive("link") ?? false,
    }),
  });
  if (!editor) return <p>Editör yükleniyor…</p>;
  const buttons: [string, () => void, boolean?][] = [
    ["Kalın", () => editor.chain().focus().toggleBold().run(), active?.bold],
    ["İtalik", () => editor.chain().focus().toggleItalic().run(), active?.italic],
    [
      "Altı çizili",
      () => editor.chain().focus().toggleUnderline().run(),
      active?.underline,
    ],
    [
      "Başlık",
      () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      active?.heading,
    ],
    [
      "Alt başlık",
      () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      active?.subheading,
    ],
    [
      "Paragraf",
      () => editor.chain().focus().setParagraph().run(),
      active?.paragraph,
    ],
    [
      "Liste",
      () => editor.chain().focus().toggleBulletList().run(),
      active?.bulletList,
    ],
    [
      "Numaralı liste",
      () => editor.chain().focus().toggleOrderedList().run(),
      active?.orderedList,
    ],
    [
      "Alıntı",
      () => editor.chain().focus().toggleBlockquote().run(),
      active?.blockquote,
    ],
    [
      "Bağlantı",
      () => {
        const href = prompt(
          "Bağlantı adresi",
          editor.getAttributes("link").href || "https://",
        );
        if (href === null) return;
        if (!href) editor.chain().focus().unsetLink().run();
        else if (/^(https?:\/\/|\/(?!\/)|#)/i.test(href))
          editor.chain().focus().setLink({ href }).run();
      },
      active?.link,
    ],
    ["Görsel", () => setMedia(true)],
    [
      "Tablo",
      () =>
        editor
          .chain()
          .focus()
          .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
          .run(),
    ],
    ["Satır ekle", () => editor.chain().focus().addRowAfter().run()],
    ["Sütun ekle", () => editor.chain().focus().addColumnAfter().run()],
    ["Tabloyu sil", () => editor.chain().focus().deleteTable().run()],
    ["Geri al", () => editor.chain().focus().undo().run()],
    ["Yinele", () => editor.chain().focus().redo().run()],
  ];
  return (
    <div className="rich-editor">
      <div className="editor-tools" role="toolbar" aria-label="Yazı araçları">
        {buttons.map(([name, fn, pressed]) => (
          <button key={name} type="button" onClick={fn} aria-pressed={pressed}>
            {name}
          </button>
        ))}
      </div>
      <EditorContent editor={editor} />
      {media && (
        <Modal title="Görsel ekle" onClose={() => setMedia(false)}>
          <MediaLibrary
            accept="image"
            onClose={() => setMedia(false)}
            onSelect={(a) => {
              editor.chain().focus().setImage({ src: a.url, alt: a.alt }).run();
              setMedia(false);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

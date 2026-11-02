import { Image } from '@tiptap/extension-image'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useRef, useState } from 'react'

import { NOTE_IMAGE_FILE_ACCEPT } from '../config/notes.config'
import type { NoteContentNode, NoteImageUploadResult } from '../models/notes.types'

interface NoteEditorProps {
  initialContent: NoteContentNode
  isUploadingImage: boolean
  onChange: (content: NoteContentNode) => void
  onUploadImage: (file: File) => Promise<NoteImageUploadResult | undefined>
}

const NoteImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      publicId: { default: null, rendered: false },
    }
  },
})

const toolbarButtonClass = (active: boolean): string =>
  `grid min-h-11 min-w-11 place-items-center rounded-xl border px-3 text-sm font-extrabold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-palette-700 ${
    active
      ? 'border-palette-700 bg-palette-700 text-white dark:border-palette-200 dark:bg-palette-200 dark:text-palette-900'
      : 'border-palette-200/80 bg-white/70 text-palette-900 hover:bg-palette-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10'
  }`

export function NoteEditor({ initialContent, isUploadingImage, onChange, onUploadImage }: NoteEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [contentError, setContentError] = useState<string | null>(null)
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        blockquote: false,
        codeBlock: false,
        heading: false,
        horizontalRule: false,
        link: false,
        strike: false,
        underline: false,
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      NoteImage.configure({ allowBase64: false, inline: false }),
    ],
    content: initialContent,
    enableContentCheck: true,
    editorProps: {
      attributes: {
        class: 'note-editor-content',
        'aria-label': 'Nội dung ghi chú',
      },
    },
    onContentError: () => setContentError('Nội dung ghi chú không tương thích với editor.'),
    onUpdate: ({ editor: currentEditor }) => onChange(currentEditor.getJSON() as NoteContentNode),
  })

  const selectImage = async (file: File | undefined) => {
    if (!file || !editor) return
    const uploaded = await onUploadImage(file)
    if (uploaded) {
      editor.chain().focus().insertContent({
        type: 'image',
        attrs: {
          src: uploaded.src,
          publicId: uploaded.publicId,
          alt: file.name,
          title: null,
          width: uploaded.width,
          height: uploaded.height,
        },
      }).run()
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (!editor) return <div className="h-72 animate-pulse rounded-2xl bg-palette-100 dark:bg-white/5" />

  return (
    <div className="note-editor overflow-hidden rounded-2xl border border-palette-200/80 bg-white/70 dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-wrap gap-2 border-b border-palette-200/70 p-2 dark:border-white/10" role="toolbar" aria-label="Định dạng ghi chú">
        <button aria-label="In đậm" className={toolbarButtonClass(editor.isActive('bold'))} onClick={() => editor.chain().focus().toggleBold().run()} type="button">B</button>
        <button aria-label="In nghiêng" className={`${toolbarButtonClass(editor.isActive('italic'))} italic`} onClick={() => editor.chain().focus().toggleItalic().run()} type="button">I</button>
        <button aria-label="Danh sách không thứ tự" className={toolbarButtonClass(editor.isActive('bulletList'))} onClick={() => editor.chain().focus().toggleBulletList().run()} type="button">• DS</button>
        <button aria-label="Danh sách có thứ tự" className={toolbarButtonClass(editor.isActive('orderedList'))} onClick={() => editor.chain().focus().toggleOrderedList().run()} type="button">1. DS</button>
        <button aria-label="Danh sách việc cần làm" className={toolbarButtonClass(editor.isActive('taskList'))} onClick={() => editor.chain().focus().toggleTaskList().run()} type="button">☑</button>
        <button aria-label="Chèn hình ảnh" className={toolbarButtonClass(false)} disabled={isUploadingImage} onClick={() => fileInputRef.current?.click()} type="button">
          {isUploadingImage ? '…' : 'Ảnh'}
        </button>
        <input
          accept={NOTE_IMAGE_FILE_ACCEPT}
          className="sr-only"
          onChange={(event) => void selectImage(event.target.files?.[0])}
          ref={fileInputRef}
          type="file"
        />
      </div>
      {contentError && <p className="m-3 text-sm font-semibold text-red-600" role="alert">{contentError}</p>}
      <EditorContent editor={editor} />
    </div>
  )
}

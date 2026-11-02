import { Image } from '@tiptap/extension-image'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { Color, TextStyle } from '@tiptap/extension-text-style'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useRef, useState } from 'react'

import { NOTE_IMAGE_FILE_ACCEPT } from '../config/notes.config'
import type { NoteContentNode, NoteImageUploadResult } from '../models/notes.types'
import { EditorToolbarIcon } from './EditorToolbarIcon'

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
        heading: { levels: [1, 2, 3] },
        horizontalRule: false,
        link: false,
        strike: false,
      }),
      TextStyle,
      Color,
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
    <div className="note-editor overflow-hidden rounded-2xl border border-palette-200/80 bg-white/20 dark:border-white/10 dark:bg-black/5">
      <div className="flex flex-wrap gap-2 border-b border-palette-200/70 p-2 dark:border-white/10" role="toolbar" aria-label="Định dạng ghi chú">
        <select
          aria-label="Kiểu văn bản"
          className="min-h-11 rounded-xl border border-palette-200/80 bg-white/70 px-3 text-sm font-bold text-palette-900 outline-none focus-visible:ring-2 focus-visible:ring-palette-700 dark:border-white/10 dark:bg-palette-900/60 dark:text-white"
          onChange={(event) => {
            const value = event.target.value
            if (value === 'paragraph') editor.chain().focus().setParagraph().run()
            else editor.chain().focus().setHeading({ level: Number(value.slice(1)) as 1 | 2 | 3 }).run()
          }}
          value={editor.isActive('heading', { level: 1 }) ? 'h1' : editor.isActive('heading', { level: 2 }) ? 'h2' : editor.isActive('heading', { level: 3 }) ? 'h3' : 'paragraph'}
        >
          <option value="paragraph">Văn bản thường</option>
          <option value="h1">Tiêu đề H1</option>
          <option value="h2">Tiêu đề H2</option>
          <option value="h3">Tiêu đề H3</option>
        </select>
        <button aria-label="In đậm" aria-pressed={editor.isActive('bold')} className={toolbarButtonClass(editor.isActive('bold'))} onClick={() => editor.chain().focus().toggleBold().run()} title="In đậm" type="button"><EditorToolbarIcon name="bold" /></button>
        <button aria-label="In nghiêng" aria-pressed={editor.isActive('italic')} className={toolbarButtonClass(editor.isActive('italic'))} onClick={() => editor.chain().focus().toggleItalic().run()} title="In nghiêng" type="button"><EditorToolbarIcon name="italic" /></button>
        <button aria-label="Gạch chân" aria-pressed={editor.isActive('underline')} className={toolbarButtonClass(editor.isActive('underline'))} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Gạch chân" type="button"><EditorToolbarIcon name="underline" /></button>
        <button aria-label="Danh sách không thứ tự" aria-pressed={editor.isActive('bulletList')} className={toolbarButtonClass(editor.isActive('bulletList'))} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Danh sách dấu chấm" type="button"><EditorToolbarIcon name="bulletList" /></button>
        <button aria-label="Danh sách có thứ tự" aria-pressed={editor.isActive('orderedList')} className={toolbarButtonClass(editor.isActive('orderedList'))} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Danh sách đánh số" type="button"><EditorToolbarIcon name="orderedList" /></button>
        <button aria-label="Danh sách việc cần làm" aria-pressed={editor.isActive('taskList')} className={toolbarButtonClass(editor.isActive('taskList'))} onClick={() => editor.chain().focus().toggleTaskList().run()} title="Danh sách việc cần làm" type="button"><EditorToolbarIcon name="taskList" /></button>
        <label aria-label="Màu chữ" className={`${toolbarButtonClass(false)} relative cursor-pointer`} title="Màu chữ">
          <EditorToolbarIcon name="palette" />
          <span className="absolute inset-x-3 bottom-1 h-1 rounded-full" style={{ backgroundColor: typeof editor.getAttributes('textStyle').color === 'string' ? editor.getAttributes('textStyle').color : '#052659' }} />
          <input
            className="absolute inset-0 cursor-pointer opacity-0"
            onChange={(event) => editor.chain().focus().setColor(event.target.value).run()}
            type="color"
            value={typeof editor.getAttributes('textStyle').color === 'string' ? editor.getAttributes('textStyle').color : '#052659'}
          />
        </label>
        <button aria-label="Chèn hình ảnh" className={toolbarButtonClass(false)} disabled={isUploadingImage} onClick={() => fileInputRef.current?.click()} type="button">
          {isUploadingImage ? '…' : <EditorToolbarIcon name="image" />}
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

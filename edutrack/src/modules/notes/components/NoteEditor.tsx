import { Image } from '@tiptap/extension-image'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { Color, TextStyle } from '@tiptap/extension-text-style'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect, useRef, useState } from 'react'

import { GlassSelect } from '@/shared/components/GlassSelect'
import { NOTE_IMAGE_FILE_ACCEPT } from '@/modules/notes/config/notes.config'
import type { NoteContentNode, NoteImageUploadResult } from '@/modules/notes/models/notes.types'
import { EditorToolbarIcon } from '@/modules/notes/components/EditorToolbarIcon'

interface NoteEditorProps {
  initialContent: NoteContentNode
  isUploadingImage: boolean
  onChange: (content: NoteContentNode) => void
  onReady: (content: NoteContentNode) => void
  onUploadImage: (file: File) => Promise<NoteImageUploadResult | undefined>
  editable?: boolean
}

const NoteImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      publicId: { default: null, rendered: false },
    }
  },
})

type TextStyleValue = 'paragraph' | 'h1' | 'h2' | 'h3'

const TEXT_STYLE_OPTIONS: ReadonlyArray<{ value: TextStyleValue; label: string }> = [
  { value: 'paragraph', label: 'Văn bản thường' },
  { value: 'h1', label: 'Tiêu đề H1' },
  { value: 'h2', label: 'Tiêu đề H2' },
  { value: 'h3', label: 'Tiêu đề H3' },
]

const toolbarButtonClass = (active: boolean): string =>
  `note-toolbar-control${active ? ' is-active' : ''}`

export function NoteEditor({ initialContent, isUploadingImage, onChange, onReady, onUploadImage, editable = true }: NoteEditorProps) {
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
    editable,
    editorProps: {
      attributes: {
        class: 'note-editor-content',
        'aria-label': 'Nội dung ghi chú',
      },
    },
    onCreate: ({ editor: currentEditor }) => onReady(currentEditor.getJSON() as NoteContentNode),
    onContentError: () => setContentError('Nội dung ghi chú không tương thích với editor.'),
    onUpdate: ({ editor: currentEditor }) => onChange(currentEditor.getJSON() as NoteContentNode),
  })
  const toolbarState = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      heading: currentEditor.isActive('heading', { level: 1 })
        ? 'h1'
        : currentEditor.isActive('heading', { level: 2 })
          ? 'h2'
          : currentEditor.isActive('heading', { level: 3 })
            ? 'h3'
            : 'paragraph',
      bold: currentEditor.isActive('bold'),
      italic: currentEditor.isActive('italic'),
      underline: currentEditor.isActive('underline'),
      bulletList: currentEditor.isActive('bulletList'),
      orderedList: currentEditor.isActive('orderedList'),
      taskList: currentEditor.isActive('taskList'),
      textColor: currentEditor.getAttributes('textStyle').color,
    }),
  })

  useEffect(() => {
    editor?.setEditable(editable)
  }, [editable, editor])

  const applyTextStyle = (value: TextStyleValue) => {
    if (!editor) return
    if (value === 'paragraph') editor.chain().focus().setParagraph().run()
    else editor.chain().focus().setHeading({ level: Number(value.slice(1)) as 1 | 2 | 3 }).run()
  }

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
    <div className="note-editor rounded-2xl border border-palette-200/80 bg-white/20 dark:border-white/10 dark:bg-black/5">
      {editable && <div className="flex flex-wrap gap-2 border-b border-palette-200/70 p-2 dark:border-white/10" role="toolbar" aria-label="Định dạng ghi chú">
        <GlassSelect ariaLabel="Kiểu văn bản" className="note-text-style-trigger" menuClassName="note-text-style-menu" onChange={applyTextStyle} options={TEXT_STYLE_OPTIONS} value={(toolbarState?.heading ?? 'paragraph') as TextStyleValue} />
        <label aria-label="Màu chữ" className={`${toolbarButtonClass(false)} relative cursor-pointer`} title="Màu chữ">
          <EditorToolbarIcon name="textColor" />
          <span className="absolute inset-x-3 bottom-1.5 h-1 rounded-full" style={{ backgroundColor: typeof toolbarState?.textColor === 'string' ? toolbarState.textColor : '#052659' }} />
          <input
            className="absolute inset-0 cursor-pointer opacity-0"
            onChange={(event) => editor.chain().focus().setColor(event.target.value).run()}
            type="color"
            value={typeof toolbarState?.textColor === 'string' ? toolbarState.textColor : '#052659'}
          />
        </label>
        <button aria-label="In đậm" aria-pressed={toolbarState?.bold ?? false} className={toolbarButtonClass(toolbarState?.bold ?? false)} onClick={() => editor.chain().focus().toggleBold().run()} title="In đậm" type="button"><EditorToolbarIcon name="bold" /></button>
        <button aria-label="In nghiêng" aria-pressed={toolbarState?.italic ?? false} className={toolbarButtonClass(toolbarState?.italic ?? false)} onClick={() => editor.chain().focus().toggleItalic().run()} title="In nghiêng" type="button"><EditorToolbarIcon name="italic" /></button>
        <button aria-label="Gạch chân" aria-pressed={toolbarState?.underline ?? false} className={toolbarButtonClass(toolbarState?.underline ?? false)} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Gạch chân" type="button"><EditorToolbarIcon name="underline" /></button>
        <button aria-label="Danh sách không thứ tự" aria-pressed={toolbarState?.bulletList ?? false} className={toolbarButtonClass(toolbarState?.bulletList ?? false)} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Danh sách dấu chấm" type="button"><EditorToolbarIcon name="bulletList" /></button>
        <button aria-label="Danh sách có thứ tự" aria-pressed={toolbarState?.orderedList ?? false} className={toolbarButtonClass(toolbarState?.orderedList ?? false)} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Danh sách đánh số" type="button"><EditorToolbarIcon name="orderedList" /></button>
        <button aria-label="Danh sách việc cần làm" aria-pressed={toolbarState?.taskList ?? false} className={toolbarButtonClass(toolbarState?.taskList ?? false)} onClick={() => editor.chain().focus().toggleTaskList().run()} title="Danh sách việc cần làm" type="button"><EditorToolbarIcon name="taskList" /></button>
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
      </div>}
      {contentError && <p className="m-3 text-sm font-semibold text-red-600" role="alert">{contentError}</p>}
      <EditorContent editor={editor} />
    </div>
  )
}

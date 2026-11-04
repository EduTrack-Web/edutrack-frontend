import { NOTE_TAG_COLOR_OPTIONS, NOTE_TAG_MAX_PER_NOTE, NOTE_TAG_NAME_MAX_LENGTH } from '../config/notes.config'
import type { NoteTag } from '../models/notes.types'
import { getTagTextColor } from '../models/tagColor'
import { NoteActionIcon } from './NoteActionIcon'
import { NoteConfirmDialog } from './NoteConfirmDialog'

interface NoteTagDialogProps {
  availableTags: NoteTag[]
  fieldError: string | null
  isCreating: boolean
  isLoading: boolean
  isSaving: boolean
  isDeleting: boolean
  editingTagId: string | null
  tagPendingDelete: NoteTag | null
  name: string
  color: string
  onCancel: () => void
  onColorChange: (value: string) => void
  onCreate: () => void
  onCancelEdit: () => void
  onStartEdit: (tag: NoteTag) => void
  onRequestDelete: (tag: NoteTag) => void
  onCancelDelete: () => void
  onConfirmDelete: () => void
  onNameChange: (value: string) => void
  onSave: () => void
  onToggle: (tagId: string) => void
  selectedTagIds: string[]
}

export function NoteTagDialog(props: NoteTagDialogProps) {
  const busy = props.isCreating || props.isSaving || props.isDeleting
  const selectedColor = props.color.toLowerCase()
  const isCustomColor = !NOTE_TAG_COLOR_OPTIONS.includes(selectedColor as (typeof NOTE_TAG_COLOR_OPTIONS)[number])
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-palette-900/50 p-4 backdrop-blur-sm" role="presentation" onMouseDown={() => { if (!busy && !props.tagPendingDelete) props.onCancel() }}>
      <section aria-labelledby="note-tag-dialog-title" aria-modal="true" className="content-card max-h-[min(720px,calc(100dvh-32px))] w-full max-w-lg overflow-y-auto p-4 sm:p-6" onMouseDown={(event) => event.stopPropagation()} role="dialog">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-palette-100 text-palette-800 dark:bg-white/10 dark:text-palette-100"><NoteActionIcon name="tag" /></span>
          <div>
            <h2 className="text-xl font-extrabold text-palette-900 dark:text-white" id="note-tag-dialog-title">Gắn thẻ ghi chú</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">Đã chọn {props.selectedTagIds.length}/{NOTE_TAG_MAX_PER_NOTE} thẻ</p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-palette-200/70 bg-white/45 p-3 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center justify-between gap-2">
            <label className="block text-xs font-extrabold text-palette-900 dark:text-white" htmlFor="new-note-tag">{props.editingTagId ? 'Chỉnh sửa thẻ' : 'Tạo thẻ mới'}</label>
            {props.editingTagId && <button className="min-h-11 rounded-xl px-3 text-xs font-bold text-palette-700 hover:bg-palette-100/70 dark:text-palette-200 dark:hover:bg-white/10" disabled={busy} onClick={props.onCancelEdit} type="button">Hủy sửa</button>}
          </div>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <div className="min-w-0 flex-1">
              <input aria-describedby={props.fieldError ? 'new-note-tag-error' : undefined} aria-invalid={Boolean(props.fieldError)} className={`min-h-11 w-full rounded-xl border bg-white/75 p-3 text-sm text-palette-900 outline-none dark:bg-palette-900/60 dark:text-white ${props.fieldError ? 'border-red-500' : 'border-palette-200/80 focus:border-palette-600 dark:border-white/15'}`} id="new-note-tag" maxLength={NOTE_TAG_NAME_MAX_LENGTH} onChange={(event) => props.onNameChange(event.target.value)} placeholder="Ví dụ: Lập trình Web" value={props.name} />
              {props.fieldError && <p className="mt-1 text-xs font-semibold text-red-600 dark:text-red-300" id="new-note-tag-error">{props.fieldError}</p>}
            </div>
            <button className="primary-button min-h-11 !rounded-xl !p-3" disabled={busy} onClick={props.onCreate} type="button">{props.isCreating ? 'Đang lưu…' : props.editingTagId ? 'Lưu thay đổi' : 'Tạo thẻ'}</button>
          </div>
          <div aria-label="Chọn màu thẻ" className="mt-3 flex flex-wrap items-center gap-2" role="group">
            {NOTE_TAG_COLOR_OPTIONS.map((color) => (
              <button aria-label={`Chọn màu ${color}`} aria-pressed={selectedColor === color} className={`size-11 rounded-full border-0 shadow-sm transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-palette-700 ${selectedColor === color ? 'ring-2 ring-palette-900 ring-offset-2 ring-offset-white dark:ring-palette-100 dark:ring-offset-palette-900' : ''}`} key={color} onClick={() => props.onColorChange(color)} style={{ backgroundColor: color }} type="button" />
            ))}
            <label className={`relative grid size-11 cursor-pointer place-items-center overflow-hidden rounded-full border-0 bg-[conic-gradient(from_90deg,#ff004c,#ff8a00,#ffe600,#54e346,#00d4ff,#315efb,#8b3dff,#ff00ae,#ff004c)] shadow-sm transition hover:scale-105 ${isCustomColor ? 'ring-2 ring-palette-900 ring-offset-2 ring-offset-white dark:ring-palette-100 dark:ring-offset-palette-900' : ''}`} title="Tùy chỉnh màu">
              <span className="sr-only">Tùy chỉnh màu thẻ</span>
              <input className="absolute inset-0 cursor-pointer opacity-0" onChange={(event) => props.onColorChange(event.target.value)} type="color" value={props.color} />
            </label>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-300">Thẻ của bạn</p>
          {props.isLoading ? (
            <div className="mt-2 h-28 animate-pulse rounded-2xl bg-palette-100/80 dark:bg-white/5" />
          ) : props.availableTags.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-palette-300 p-4 text-center text-sm text-slate-500 dark:border-white/15 dark:text-slate-300">Chưa có thẻ. Hãy tạo thẻ đầu tiên.</p>
          ) : (
            <div className="mt-2 flex max-h-60 flex-wrap content-start gap-2 overflow-y-auto p-1">
              {props.availableTags.map((tag) => {
                const selected = props.selectedTagIds.includes(tag.id)
                const textColor = getTagTextColor(tag.color)
                return (
                  <div className={`inline-flex max-w-full items-center overflow-hidden rounded-full border-0 shadow-sm transition hover:-translate-y-0.5 hover:brightness-105 ${selected ? 'ring-2 ring-palette-900 ring-offset-2 ring-offset-white dark:ring-palette-100 dark:ring-offset-palette-900' : ''}`} key={tag.id} style={{ backgroundColor: tag.color, color: textColor }}>
                    <button aria-pressed={selected} className="inline-flex min-h-11 min-w-0 items-center gap-2 py-2 pl-3 pr-2 text-left text-sm font-extrabold focus-visible:outline-2 focus-visible:outline-inset" onClick={() => props.onToggle(tag.id)} type="button">
                      <span className="max-w-40 truncate">{tag.name}</span>
                      {selected && <span aria-hidden="true" className="grid size-5 shrink-0 place-items-center rounded-full text-xs font-black" style={{ backgroundColor: textColor, color: tag.color }}>✓</span>}
                    </button>
                    <button aria-label={`Sửa thẻ ${tag.name}`} className="grid size-11 shrink-0 place-items-center transition hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-inset" disabled={busy} onClick={() => props.onStartEdit(tag)} title="Sửa thẻ" type="button"><NoteActionIcon className="size-4" name="edit" /></button>
                    <button aria-label={`Xóa thẻ ${tag.name}`} className="grid size-11 shrink-0 place-items-center transition hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-inset" disabled={busy} onClick={() => props.onRequestDelete(tag)} title="Xóa thẻ" type="button"><NoteActionIcon className="size-4" name="trash" /></button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button className="secondary-button !min-h-11 !p-3" disabled={busy} onClick={props.onCancel} type="button">Hủy</button>
          <button className="primary-button !min-h-11 !p-3" disabled={busy || props.isLoading} onClick={props.onSave} type="button">{props.isSaving ? 'Đang lưu…' : 'Lưu thẻ'}</button>
        </div>
      </section>
      {props.tagPendingDelete && (
        <NoteConfirmDialog
          confirmLabel="Xóa thẻ"
          description={`Thẻ “${props.tagPendingDelete.name}” sẽ bị gỡ khỏi tất cả ghi chú của bạn. Hành động này không thể hoàn tác.`}
          icon={<NoteActionIcon name="trash" />}
          isBusy={props.isDeleting}
          onCancel={props.onCancelDelete}
          onConfirm={props.onConfirmDelete}
          title="Xóa thẻ?"
        />
      )}
    </div>
  )
}

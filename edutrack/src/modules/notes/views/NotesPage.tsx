import { Icon } from '@/shared/components/Icon'
import { getNoteBackgroundOption, NOTE_DEFAULT_TITLE } from '@/modules/notes/config/notes.config'
import { NotePreview } from '@/modules/notes/components/NotePreview'
import { NoteActionIcon } from '@/modules/notes/components/NoteActionIcon'
import { NoteActionsMenu } from '@/modules/notes/components/NoteActionsMenu'
import { NoteConfirmDialog } from '@/modules/notes/components/NoteConfirmDialog'
import { NoteTagChips } from '@/modules/notes/components/NoteTagChips'
import { NoteTagDialog } from '@/modules/notes/components/NoteTagDialog'
import { NoteTagFilterDropdown } from '@/modules/notes/components/NoteTagFilterDropdown'
import { NoteShareDialog } from '@/modules/notes/components/NoteShareDialog'
import { useNoteShareViewModel } from '@/modules/notes/viewmodels/useNoteShareViewModel'
import { useNotesViewModel } from '@/modules/notes/viewmodels/useNotesViewModel'

export function NotesPage() {
  const vm = useNotesViewModel()
  const shareVm = useNoteShareViewModel()

  const formatUpdatedAt = (value: string): string => new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))

  return (
    <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
      <section className="p-1 sm:p-2">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-palette-900 sm:text-3xl dark:text-white">Ghi chú của bạn</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Ghi chú mới nhất được hiển thị trước.</p>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <button className="secondary-button min-h-11 flex-1 !p-3 sm:flex-none" onClick={vm.openTrash} type="button">
              <NoteActionIcon name="trash" />
              Thùng rác
            </button>
            <button className="primary-button min-h-11 flex-1 !p-3 sm:flex-none" disabled={vm.isCreating} onClick={() => void vm.createNote()} type="button">
              <Icon className="size-5" name="plus" />
              {vm.isCreating ? 'Đang tạo…' : 'Tạo ghi chú'}
            </button>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-palette-200/70 bg-white/35 p-3 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 sm:p-4">
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <NoteActionIcon className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-500 dark:text-slate-300" name="search" />
              <input aria-label="Tìm kiếm ghi chú" className="min-h-11 w-full rounded-xl border border-palette-200/80 bg-white/75 py-3 pl-10 pr-11 text-sm text-palette-900 outline-none transition focus:border-palette-600 dark:border-white/15 dark:bg-palette-900/55 dark:text-white" maxLength={100} onChange={(event) => vm.updateSearchQuery(event.target.value)} placeholder="Tìm theo tiêu đề hoặc nội dung" value={vm.searchQuery} />
              {vm.searchQuery && <button aria-label="Xóa từ khóa tìm kiếm" className="absolute right-0 top-1/2 grid size-11 -translate-y-1/2 place-items-center text-slate-500" onClick={() => vm.updateSearchQuery('')} type="button"><NoteActionIcon name="close" /></button>}
            </div>
            <NoteTagFilterDropdown onClear={vm.clearTagFilters} onToggle={vm.toggleFilterTag} selectedTagIds={vm.filterTagIds} tags={vm.availableTags} />
            {vm.isSearching && <span aria-live="polite" className="hidden text-xs font-bold text-slate-500 sm:inline">Đang tìm…</span>}
          </div>
        </div>

        {vm.isLoading ? (
          <div className="mt-6 columns-2 gap-3 md:columns-3" aria-label="Đang tải ghi chú">
            {[0, 1, 2, 3, 4, 5].map((item) => <div className={`mb-3 break-inside-avoid animate-pulse rounded-2xl bg-palette-100/80 dark:bg-white/5 ${item % 3 === 0 ? 'h-48' : 'h-36'}`} key={item} />)}
          </div>
        ) : vm.loadFailed ? (
          <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50/70 px-4 py-10 text-center dark:border-red-400/20 dark:bg-red-950/20">
            <Icon className="size-9 text-red-600 dark:text-red-300" name="error" />
            <h3 className="mt-3 text-lg font-extrabold text-palette-900 dark:text-white">Không thể tải danh sách ghi chú</h3>
            <button className="secondary-button mt-5" onClick={() => void vm.retry()} type="button">Thử lại</button>
          </div>
        ) : vm.notes.length === 0 ? (
          <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-palette-300/80 px-4 py-12 text-center dark:border-white/15">
            <span className="grid size-14 place-items-center rounded-2xl bg-palette-100 text-palette-700 dark:bg-white/10 dark:text-palette-200">
              <Icon className="size-7" name="notes" />
            </span>
            <h3 className="mt-4 text-lg font-extrabold text-palette-900 dark:text-white">{vm.hasSearchFilters ? 'Không tìm thấy ghi chú phù hợp' : 'Bạn chưa có ghi chú nào'}</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300">{vm.hasSearchFilters ? 'Hãy thay đổi từ khóa hoặc bộ lọc thẻ.' : 'Chọn “Tạo ghi chú” để bắt đầu. Bản ghi mặc định vẫn được giữ nếu bạn rời đi mà chưa nhập nội dung.'}</p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 items-start gap-3 md:grid-cols-3">
            {vm.noteColumns.map((column, columnIndex) => (
              <div className="flex min-w-0 flex-col gap-3" key={`note-column-${columnIndex}`}>
                {column.map((note) => (
                  <article
                    aria-label={`Mở ghi chú ${note.title}`}
                    className={`relative w-full rounded-2xl border border-palette-200/80 p-3 text-left shadow-xs transition hover:-translate-y-0.5 hover:border-palette-500/50 hover:shadow-md focus-within:z-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-palette-700 dark:border-white/10 ${getNoteBackgroundOption(note.background).cardClass}`}
                    key={note.id}
                    onClick={() => vm.openNote(note.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        vm.openNote(note.id)
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <span className={`line-clamp-2 text-sm font-extrabold text-palette-900 sm:text-base dark:text-white ${note.title === NOTE_DEFAULT_TITLE ? 'opacity-70' : ''}`}>{note.title}</span>
                    <div className="mt-2 text-sm leading-5 text-slate-700 dark:text-slate-200">
                      {note.preview ? <NotePreview content={note.contentPreview} /> : <span className="italic opacity-60">Chưa có nội dung</span>}
                    </div>
                    {note.tags.length > 0 && (
                      <div className="mt-3">
                        <NoteTagChips compact tags={note.tags} />
                      </div>
                    )}
                    <div className="mt-2 flex min-w-0 items-center justify-between gap-1">
                      <span className="min-w-0 truncate text-[11px] font-semibold text-slate-500 dark:text-slate-300">Cập nhật {formatUpdatedAt(note.updatedAt)}</span>
                      <div className="flex shrink-0 items-center">
                        {note.access.isSharedWithMe && <span aria-label="Ghi chú được chia sẻ với bạn" className="grid size-9 place-items-center text-palette-700 dark:text-palette-200" title="Ghi chú được chia sẻ với bạn"><NoteActionIcon name="users" /></span>}
                        <button aria-label="Chia sẻ ghi chú" className="note-more-button" onClick={(event) => { event.stopPropagation(); void shareVm.open(note.id) }} title="Chia sẻ ghi chú" type="button"><NoteActionIcon name="share" /></button>
                        <NoteActionsMenu
                          isDuplicating={vm.busyNoteId === note.id}
                          onDelete={note.access.role === 'owner' ? () => vm.requestMoveToTrash(note) : undefined}
                          onDuplicate={() => void vm.duplicateNote(note.id)}
                          onTags={() => void vm.openTagDialog(note.id)}
                        />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>

      {vm.noteToTrash && (
        <NoteConfirmDialog
          confirmLabel="Chuyển vào thùng rác"
          description="Ghi chú sẽ được chuyển vào thùng rác và tự động xóa sau 30 ngày. Bạn có chắc chắn muốn tiếp tục không?"
          icon={<NoteActionIcon name="trash" />}
          isBusy={vm.busyNoteId === vm.noteToTrash.id}
          onCancel={vm.cancelMoveToTrash}
          onConfirm={() => void vm.moveToTrash()}
          title="Xóa ghi chú?"
        />
      )}

      {vm.activeTagNoteId && (
        <NoteTagDialog
          availableTags={vm.availableTags}
          color={vm.tagColor}
          fieldError={vm.tagFieldError}
          isCreating={vm.isCreatingTag}
          isDeleting={vm.isDeletingTag}
          isLoading={vm.isLoadingTags}
          isSaving={vm.isSavingTags}
          editingTagId={vm.editingTagId}
          tagPendingDelete={vm.tagPendingDelete}
          name={vm.tagName}
          onCancel={vm.closeTagDialog}
          onColorChange={vm.updateTagColor}
          onCreate={() => void vm.createTag()}
          onCancelEdit={vm.cancelEditTag}
          onStartEdit={vm.startEditTag}
          onRequestDelete={vm.requestDeleteTag}
          onCancelDelete={vm.cancelDeleteTag}
          onConfirmDelete={() => void vm.deletePersonalTag()}
          onNameChange={vm.updateTagName}
          onSave={() => void vm.saveTags()}
          onToggle={vm.toggleSelectedTag}
          selectedTagIds={vm.selectedTagIds}
        />
      )}
      <NoteShareDialog vm={shareVm} />
    </div>
  )
}

import { Icon } from '../../../shared/components/Icon'
import { NoteActionIcon } from '../components/NoteActionIcon'
import { NoteConfirmDialog } from '../components/NoteConfirmDialog'
import { NotePreview } from '../components/NotePreview'
import { getNoteBackgroundOption, NOTE_DEFAULT_TITLE } from '../config/notes.config'
import { useNoteTrashViewModel } from '../viewmodels/useNoteTrashViewModel'

const DAY_MS = 24 * 60 * 60 * 1000

const daysUntilPurge = (purgeAt: string): number =>
  Math.max(0, Math.ceil((new Date(purgeAt).getTime() - Date.now()) / DAY_MS))

const formatDeletedAt = (value: string): string => new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date(value))

export function NoteTrashPage() {
  const vm = useNoteTrashViewModel()

  return (
    <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
      <section className="p-1 sm:p-2">
        <div className="flex items-start gap-3">
          <button aria-label="Trở lại danh sách ghi chú" className="note-back-button" onClick={vm.goToNotes} type="button">
            <Icon className="size-5 rotate-180" name="arrowRight" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-palette-900 sm:text-3xl dark:text-white">Thùng rác ghi chú</h1>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">Ghi chú được giữ trong 30 ngày trước khi tự động xóa vĩnh viễn.</p>
          </div>
        </div>

        {vm.isLoading ? (
          <div aria-label="Đang tải thùng rác" className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((item) => <div className="h-48 animate-pulse rounded-2xl bg-palette-100/80 dark:bg-white/5" key={item} />)}
          </div>
        ) : vm.loadFailed ? (
          <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50/70 px-4 py-10 text-center dark:border-red-400/20 dark:bg-red-950/20">
            <Icon className="size-9 text-red-600 dark:text-red-300" name="error" />
            <h2 className="mt-3 text-lg font-extrabold text-palette-900 dark:text-white">Không thể tải thùng rác</h2>
            <button className="secondary-button mt-5 !min-h-11 !p-3" onClick={() => void vm.retry()} type="button">Thử lại</button>
          </div>
        ) : vm.notes.length === 0 ? (
          <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-palette-300/80 px-4 py-12 text-center dark:border-white/15">
            <span className="grid size-14 place-items-center rounded-2xl bg-palette-100 text-palette-700 dark:bg-white/10 dark:text-palette-200"><NoteActionIcon className="size-7" name="trash" /></span>
            <h2 className="mt-4 text-lg font-extrabold text-palette-900 dark:text-white">Thùng rác đang trống</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Các ghi chú bạn xóa sẽ xuất hiện tại đây.</p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 items-start gap-3 md:grid-cols-3">
            {vm.notes.map((note) => {
              const isBusy = vm.busyNoteId === note.id
              return (
                <article className={`min-w-0 rounded-2xl border border-palette-200/80 p-3 shadow-xs dark:border-white/10 ${getNoteBackgroundOption(note.background).cardClass}`} key={note.id}>
                  <h2 className={`line-clamp-2 text-sm font-extrabold text-palette-900 sm:text-base dark:text-white ${note.title === NOTE_DEFAULT_TITLE ? 'opacity-70' : ''}`}>{note.title}</h2>
                  <div className="mt-2 text-sm leading-5 text-slate-700 dark:text-slate-200">{note.preview ? <NotePreview content={note.contentPreview} /> : <span className="italic opacity-60">Chưa có nội dung</span>}</div>
                  <div className="mt-3 space-y-1 text-[11px] font-semibold text-slate-500 dark:text-slate-300">
                    <p>Đã xóa {formatDeletedAt(note.deletedAt)}</p>
                    <p>Còn {daysUntilPurge(note.purgeAt)} ngày trước khi xóa vĩnh viễn</p>
                  </div>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <button className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-palette-300/60 bg-white/65 p-3 text-xs font-extrabold text-palette-800 backdrop-blur-md transition hover:bg-white/90 disabled:opacity-60 dark:border-white/15 dark:bg-white/8 dark:text-palette-100" disabled={Boolean(vm.busyNoteId)} onClick={() => void vm.restoreNote(note.id)} type="button">
                      <NoteActionIcon name="restore" />
                      <span>{isBusy ? 'Đang xử lý…' : 'Khôi phục'}</span>
                    </button>
                    <button aria-label={`Xóa vĩnh viễn ${note.title}`} className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-red-300/50 bg-red-50/70 p-3 text-red-700 transition hover:bg-red-100 disabled:opacity-60 dark:border-red-300/20 dark:bg-red-400/10 dark:text-red-200" disabled={Boolean(vm.busyNoteId)} onClick={() => vm.requestPermanentDelete(note)} title="Xóa vĩnh viễn" type="button"><NoteActionIcon name="trash" /></button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {vm.noteToDelete && (
        <NoteConfirmDialog
          confirmLabel="Xóa vĩnh viễn"
          description={`“${vm.noteToDelete.title}” và toàn bộ hình ảnh trong ghi chú sẽ bị xóa vĩnh viễn. Thao tác này không thể hoàn tác.`}
          icon={<NoteActionIcon name="trash" />}
          isBusy={vm.busyNoteId === vm.noteToDelete.id}
          onCancel={vm.cancelPermanentDelete}
          onConfirm={() => void vm.deletePermanently()}
          title="Xóa vĩnh viễn ghi chú?"
        />
      )}
    </div>
  )
}

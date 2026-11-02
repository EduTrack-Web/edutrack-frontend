import { Icon } from '../../../shared/components/Icon'
import { getNoteBackgroundOption, NOTE_DEFAULT_TITLE } from '../config/notes.config'
import { NotePreview } from '../components/NotePreview'
import { useNotesViewModel } from '../viewmodels/useNotesViewModel'

export function NotesPage() {
  const vm = useNotesViewModel()

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
          <button className="primary-button w-full sm:w-auto" disabled={vm.isCreating} onClick={() => void vm.createNote()} type="button">
            <Icon className="size-5" name="plus" />
            {vm.isCreating ? 'Đang tạo…' : 'Tạo ghi chú'}
          </button>
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
            <h3 className="mt-4 text-lg font-extrabold text-palette-900 dark:text-white">Bạn chưa có ghi chú nào</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300">Chọn “Tạo ghi chú” để bắt đầu. Bản ghi mặc định vẫn được giữ nếu bạn rời đi mà chưa nhập nội dung.</p>
          </div>
        ) : (
          <div className="mt-6 columns-2 gap-3 md:columns-3">
            {vm.notes.map((note) => (
              <article
                aria-label={`Mở ghi chú ${note.title}`}
                className={`mb-3 w-full break-inside-avoid rounded-2xl border border-palette-200/80 p-3 text-left align-top shadow-xs transition hover:-translate-y-0.5 hover:border-palette-500/50 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-palette-700 dark:border-white/10 ${getNoteBackgroundOption(note.background).cardClass}`}
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
                <span className="mt-3 block text-[11px] font-semibold text-slate-500 dark:text-slate-300">Cập nhật {formatUpdatedAt(note.updatedAt)}</span>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

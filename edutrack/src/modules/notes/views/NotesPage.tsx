import { Icon } from '../../../shared/components/Icon'
import { useNotesViewModel } from '../viewmodels/useNotesViewModel'

export function NotesPage() {
  const vm = useNotesViewModel()

  const formatUpdatedAt = (value: string): string => new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Banner không gian học tập */}
      <section className="dashboard-banner p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-16 size-72 rounded-full border border-palette-500/15 bg-gradient-to-br from-palette-200/30 to-palette-700/10 blur-[1px] dark:border-white/10 dark:bg-white/5" />
        
        <div className="relative max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-palette-700/20 bg-palette-100/90 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-palette-700 shadow-xs dark:border-palette-200/20 dark:bg-palette-700/25 dark:text-palette-200">
              <Icon className="size-3.5" name="notes" />
              Sổ tay Ghi chú
            </span>
            <span className="rounded-full bg-palette-900/10 px-2.5 py-0.5 text-xs font-semibold text-palette-900 dark:bg-white/10 dark:text-palette-200">
              Phụ trách: {vm.assignedMember}
            </span>
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-palette-900 sm:text-4xl dark:text-white">
            {vm.title}
          </h1>
          <p className="mt-3 max-w-xl text-sm font-medium leading-7 text-[#476685] sm:text-base dark:text-palette-200/85">
            {vm.description}
          </p>
        </div>
      </section>

      <section className="content-card p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-palette-900 dark:text-white">Ghi chú của bạn</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Ghi chú mới nhất được hiển thị trước.</p>
          </div>
          <button className="primary-button w-full sm:w-auto" disabled={vm.isCreating} onClick={() => void vm.createNote()} type="button">
            <Icon className="size-5" name="plus" />
            {vm.isCreating ? 'Đang tạo…' : 'Tạo ghi chú'}
          </button>
        </div>

        {vm.isLoading ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Đang tải ghi chú">
            {[0, 1, 2].map((item) => <div className="h-36 animate-pulse rounded-2xl bg-palette-100/80 dark:bg-white/5" key={item} />)}
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
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {vm.notes.map((note) => (
              <button
                className="min-h-36 rounded-2xl border border-palette-200/80 bg-white/65 p-4 text-left transition hover:-translate-y-0.5 hover:border-palette-500/50 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-palette-700 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                key={note.id}
                onClick={() => vm.openNote(note.id)}
                type="button"
              >
                <span className="line-clamp-2 text-base font-extrabold text-palette-900 dark:text-white">{note.title}</span>
                <span className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-slate-600 dark:text-slate-300">{note.preview || 'Chưa có nội dung'}</span>
                <span className="mt-4 block text-xs font-semibold text-slate-500 dark:text-slate-400">Cập nhật {formatUpdatedAt(note.updatedAt)}</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

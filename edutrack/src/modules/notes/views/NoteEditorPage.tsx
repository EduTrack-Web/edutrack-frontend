import { useBlocker } from 'react-router-dom'

import { Icon } from '../../../shared/components/Icon'
import { NOTE_TITLE_MAX_LENGTH } from '../config/notes.config'
import { NoteEditor } from '../components/NoteEditor'
import { useNoteEditorViewModel, type NoteSaveStatus } from '../viewmodels/useNoteEditorViewModel'

const statusText: Record<NoteSaveStatus, string> = {
  idle: '',
  unsaved: 'Chưa lưu',
  saving: 'Đang lưu…',
  saved: 'Đã lưu',
  error: 'Lưu thất bại – sẽ thử lại',
}

export function NoteEditorPage() {
  const vm = useNoteEditorViewModel()
  const blocker = useBlocker(vm.hasUnsavedChanges)

  if (vm.isLoading) {
    return <div className="mx-auto max-w-5xl"><div className="content-card h-96 animate-pulse" aria-label="Đang tải ghi chú" /></div>
  }

  if (vm.loadError || !vm.content) {
    return (
      <section className="content-card mx-auto max-w-2xl p-6 text-center sm:p-8">
        <Icon className="mx-auto size-10 text-red-600" name="error" />
        <h1 className="mt-4 text-xl font-extrabold text-palette-900 dark:text-white">Không thể mở ghi chú</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{vm.loadError}</p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button className="primary-button" onClick={() => void vm.retry()} type="button">Thử lại</button>
          <button className="secondary-button" onClick={vm.goToNotes} type="button">Về danh sách</button>
        </div>
      </section>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 sm:space-y-6">
      <section className="content-card p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button className="secondary-button w-full sm:w-auto" onClick={vm.goToNotes} type="button">← Danh sách ghi chú</button>
          <span className={`text-sm font-bold ${vm.saveStatus === 'error' ? 'text-red-600' : 'text-slate-600 dark:text-slate-300'}`} aria-live="polite">
            {statusText[vm.saveStatus]}
          </span>
        </div>
        <label className="mt-5 block" htmlFor="note-title">
          <span className="sr-only">Tiêu đề ghi chú</span>
          <input
            className="w-full border-0 border-b border-palette-200/80 bg-transparent px-1 pb-3 text-2xl font-black text-palette-900 outline-none focus:border-palette-700 sm:text-3xl dark:border-white/10 dark:text-white dark:focus:border-palette-200"
            id="note-title"
            maxLength={NOTE_TITLE_MAX_LENGTH}
            onChange={(event) => vm.updateTitle(event.target.value)}
            placeholder="Ghi chú không tiêu đề"
            value={vm.title}
          />
        </label>
        <div className="mt-4">
          <NoteEditor
            initialContent={vm.content}
            isUploadingImage={vm.isUploadingImage}
            onChange={vm.updateContent}
            onUploadImage={vm.uploadImage}
          />
        </div>
      </section>

      {blocker.state === 'blocked' && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-palette-900/45 p-4" role="presentation" onMouseDown={() => blocker.reset()}>
          <section aria-describedby="unsaved-note-description" aria-labelledby="unsaved-note-title" aria-modal="true" className="content-card w-full max-w-md p-6" onMouseDown={(event) => event.stopPropagation()} role="dialog">
            <h2 className="text-xl font-extrabold text-palette-900 dark:text-white" id="unsaved-note-title">Nội dung chưa được lưu</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300" id="unsaved-note-description">Thay đổi mới nhất chưa được lưu hoàn tất. Nếu rời đi, hệ thống sẽ dùng phiên bản được lưu gần nhất.</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button className="secondary-button" onClick={() => blocker.reset()} type="button">Ở lại</button>
              <button className="primary-button" onClick={() => blocker.proceed()} type="button">Rời khỏi</button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

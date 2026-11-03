import { useBlocker } from 'react-router-dom'

import { Icon } from '../../../shared/components/Icon'
import {
  getNoteBackgroundOption,
  NOTE_BACKGROUND_OPTIONS,
  NOTE_DEFAULT_TITLE,
  NOTE_TITLE_MAX_LENGTH,
} from '../config/notes.config'
import { NoteEditor } from '../components/NoteEditor'
import { EditorToolbarIcon } from '../components/EditorToolbarIcon'
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
  const backgroundOption = getNoteBackgroundOption(vm.background)

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
      <section className={`rounded-3xl border border-palette-200/80 p-4 shadow-lg transition-colors sm:p-6 dark:border-white/10 ${backgroundOption.editorClass}`}>
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <button aria-label="Trở lại danh sách ghi chú" className="note-back-button" onClick={vm.goToNotes} type="button">
            <Icon className="size-5 rotate-180" name="arrowRight" />
            <span className="hidden sm:inline">Danh sách ghi chú</span>
          </button>
          <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
            <span className={`truncate text-xs font-bold sm:text-sm ${vm.saveStatus === 'error' ? 'text-red-600 dark:text-red-300' : 'text-slate-600 dark:text-slate-200'}`} aria-live="polite">{statusText[vm.saveStatus]}</span>
            <button
              className="primary-button min-h-11 shrink-0 !p-3 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!vm.hasUnsavedChanges || vm.saveStatus === 'saving'}
              onClick={() => void vm.saveNow()}
              type="button"
            >
              <EditorToolbarIcon name="save" />
              Lưu
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Màu nền ghi chú" role="group">
          <span className="mr-1 text-xs font-bold text-slate-600 dark:text-slate-200">Màu nền</span>
          {NOTE_BACKGROUND_OPTIONS.map((option) => (
            <button
              aria-label={option.label}
              aria-pressed={vm.background === option.value}
              className={`size-8 rounded-full border-2 shadow-xs transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-palette-700 ${option.swatchClass} ${vm.background === option.value ? 'border-palette-700 ring-2 ring-white dark:border-palette-200' : 'border-white/80 dark:border-white/20'}`}
              key={option.value}
              onClick={() => vm.updateBackground(option.value)}
              title={option.label}
              type="button"
            />
          ))}
        </div>
        <label className="mt-5 block" htmlFor="note-title">
          <span className="sr-only">Tiêu đề ghi chú</span>
          <input
            className={`w-full border-0 border-b border-palette-900/15 bg-transparent px-1 pb-3 text-2xl font-black text-palette-900 outline-none transition-opacity focus:border-palette-700 sm:text-3xl dark:border-white/15 dark:text-white dark:focus:border-palette-200 ${vm.title === NOTE_DEFAULT_TITLE ? 'opacity-70' : 'opacity-100'}`}
            id="note-title"
            maxLength={NOTE_TITLE_MAX_LENGTH}
            onChange={(event) => vm.updateTitle(event.target.value)}
            onFocus={(event) => { if (vm.title === NOTE_DEFAULT_TITLE) event.currentTarget.select() }}
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

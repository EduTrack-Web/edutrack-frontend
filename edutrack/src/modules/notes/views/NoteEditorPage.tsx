import { useBlocker } from 'react-router-dom'

import { Icon } from '@/shared/components/Icon'
import {
  getNoteBackgroundOption,
  NOTE_BACKGROUND_OPTIONS,
  NOTE_DEFAULT_TITLE,
  NOTE_TITLE_MAX_LENGTH,
} from '@/modules/notes/config/notes.config'
import { NoteEditor } from '@/modules/notes/components/NoteEditor'
import { NoteActionIcon } from '@/modules/notes/components/NoteActionIcon'
import { NoteActionsMenu } from '@/modules/notes/components/NoteActionsMenu'
import { NoteConfirmDialog } from '@/modules/notes/components/NoteConfirmDialog'
import { NoteTagChips } from '@/modules/notes/components/NoteTagChips'
import { NoteTagDialog } from '@/modules/notes/components/NoteTagDialog'
import { NoteShareDialog } from '@/modules/notes/components/NoteShareDialog'
import { EditorToolbarIcon } from '@/modules/notes/components/EditorToolbarIcon'
import { useNoteShareViewModel } from '@/modules/notes/viewmodels/useNoteShareViewModel'
import { useNoteEditorViewModel, type NoteSaveStatus } from '@/modules/notes/viewmodels/useNoteEditorViewModel'

const statusText: Record<NoteSaveStatus, string> = {
  idle: '',
  unsaved: 'Chưa lưu',
  saving: 'Đang lưu…',
  saved: 'Đã lưu',
  error: 'Lưu thất bại – sẽ thử lại',
}

export function NoteEditorPage() {
  const vm = useNoteEditorViewModel()
  const shareVm = useNoteShareViewModel()
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
            {vm.note?.access.isSharedWithMe && <span aria-label="Ghi chú được chia sẻ với bạn" className="grid size-11 shrink-0 place-items-center text-palette-700 dark:text-palette-200" title="Ghi chú được chia sẻ với bạn"><NoteActionIcon name="users" /></span>}
            <span className={`truncate text-xs font-bold sm:text-sm ${vm.saveStatus === 'error' ? 'text-red-600 dark:text-red-300' : 'text-slate-600 dark:text-slate-200'}`} aria-live="polite">{vm.note?.access.canEdit ? statusText[vm.saveStatus] : 'Chỉ xem'}</span>
            {vm.note?.access.canEdit && <button
              className="note-save-button shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!vm.hasUnsavedChanges || vm.saveStatus === 'saving'}
              onClick={() => void vm.saveNow()}
              type="button"
            >
              <EditorToolbarIcon name="save" />
              Lưu
            </button>}
            <button aria-label="Chia sẻ ghi chú" className="note-more-button" onClick={() => { if (vm.note) void shareVm.open(vm.note.id) }} title="Chia sẻ ghi chú" type="button"><NoteActionIcon name="share" /></button>
            <NoteActionsMenu
              isDuplicating={vm.isDuplicating}
              onDelete={vm.note?.access.role === 'owner' ? vm.openDeleteDialog : undefined}
              onDuplicate={() => void vm.duplicateNote()}
              onTags={() => void vm.openTagDialog()}
            />
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
              disabled={!vm.note?.access.canEdit}
              onClick={() => vm.updateBackground(option.value)}
              title={option.label}
              type="button"
            />
          ))}
        </div>
        <div className="mt-4">
          <NoteTagChips onRemove={(tagId) => void vm.removeTag(tagId)} tags={vm.noteTags} />
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
            readOnly={!vm.note?.access.canEdit}
            value={vm.title}
          />
        </label>
        <div className="mt-4">
          <NoteEditor
            key={vm.note?.id}
            initialContent={vm.content}
            editable={vm.note?.access.canEdit}
            isUploadingImage={vm.isUploadingImage}
            onChange={vm.updateContent}
            onReady={vm.initializeEditorContent}
            onUploadImage={vm.uploadImage}
          />
        </div>
      </section>

      {vm.isDeleteDialogOpen && (
        <NoteConfirmDialog
          confirmLabel="Chuyển vào thùng rác"
          description="Ghi chú sẽ được chuyển vào thùng rác và tự động xóa sau 30 ngày. Bạn có chắc chắn muốn tiếp tục không?"
          icon={<NoteActionIcon name="trash" />}
          isBusy={vm.isDeleting}
          onCancel={vm.closeDeleteDialog}
          onConfirm={() => void vm.moveToTrash()}
          title="Xóa ghi chú?"
        />
      )}

      {vm.isTagDialogOpen && (
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

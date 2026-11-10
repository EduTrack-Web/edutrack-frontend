import { GlassSelect } from '@/shared/components/GlassSelect'
import { NoteActionIcon } from '@/modules/notes/components/NoteActionIcon'
import { NoteConfirmDialog } from '@/modules/notes/components/NoteConfirmDialog'
import type { NotePermission, NoteShareUser } from '@/modules/notes/models/notes.types'
import { useNoteShareViewModel } from '@/modules/notes/viewmodels/useNoteShareViewModel'

export type NoteShareViewModel = ReturnType<typeof useNoteShareViewModel>

const Avatar = ({ user }: { user: NoteShareUser }) => (
  user.avatarUrl
    ? <img alt="" className="size-10 shrink-0 rounded-full object-cover" src={user.avatarUrl} />
    : <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-palette-200 text-sm font-black text-palette-900 dark:bg-white/15 dark:text-white">{user.fullName.trim().charAt(0).toUpperCase()}</span>
)

const permissionLabel: Record<NotePermission, string> = { view: 'Chỉ xem', edit: 'Chỉnh sửa' }
const permissionOptions = [
  { value: 'view', label: 'Chỉ xem' },
  { value: 'edit', label: 'Chỉnh sửa' },
] as const

export function NoteShareDialog({ vm }: { vm: NoteShareViewModel }) {
  if (!vm.noteId) return null
  const collaboratorIds = new Set(vm.collaborators.map((item) => item.id))
  const pendingDescription = vm.pendingAction?.type === 'remove'
    ? `Thu hồi quyền truy cập của ${vm.pendingAction.user.fullName}?`
    : vm.pendingAction
      ? `Cấp quyền ${permissionLabel[vm.pendingAction.permission].toLocaleLowerCase('vi-VN')} cho ${vm.pendingAction.user.fullName}?`
      : ''

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-palette-900/45 p-4" role="presentation" onMouseDown={vm.close}>
      <section aria-labelledby="note-share-title" aria-modal="true" className="content-card max-h-[calc(100dvh-32px)] w-full max-w-xl overflow-y-auto p-4 sm:p-6" onMouseDown={(event) => event.stopPropagation()} role="dialog">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-palette-100 text-palette-800 dark:bg-white/10 dark:text-palette-100"><NoteActionIcon name="share" /></span>
            <div>
              <h2 className="text-xl font-extrabold text-palette-900 dark:text-white" id="note-share-title">Chia sẻ ghi chú</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">Người được thêm trực tiếp có thể quản lý danh sách truy cập.</p>
            </div>
          </div>
          <button aria-label="Đóng chia sẻ" className="grid size-11 shrink-0 place-items-center rounded-full text-palette-800 transition hover:bg-palette-100 dark:text-white dark:hover:bg-white/10" onClick={vm.close} type="button"><NoteActionIcon name="close" /></button>
        </div>

        {vm.isLoading ? <div className="mt-6 h-48 animate-pulse rounded-2xl bg-palette-100/70 dark:bg-white/5" /> : (
          <>
            <div className="mt-6 rounded-2xl border border-palette-200/80 bg-white/55 p-3 dark:border-white/10 dark:bg-white/5">
              <label className="text-xs font-extrabold text-palette-900 dark:text-white" htmlFor="note-share-search">Thêm bằng username hoặc email</label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <div className="relative min-w-0 flex-1">
                  <NoteActionIcon className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-500" name="search" />
                  <input className="min-h-11 w-full rounded-xl border border-palette-200/80 bg-white/80 py-3 pl-10 pr-3 text-sm text-palette-900 outline-none focus:border-palette-600 dark:border-white/15 dark:bg-palette-900/60 dark:text-white" id="note-share-search" onChange={(event) => vm.updateQuery(event.target.value)} placeholder="Nhập ít nhất 2 ký tự" value={vm.query} />
                </div>
                <GlassSelect ariaLabel="Quyền khi thêm" className="sm:min-w-36" onChange={vm.updatePermission} options={permissionOptions} value={vm.permission} />
              </div>
              {vm.query.trim().length >= 2 && (
                <div className="mt-2 space-y-1">
                  {vm.isSearching && <p className="p-3 text-sm text-slate-500">Đang tìm…</p>}
                  {!vm.isSearching && vm.results.length === 0 && <p className="p-3 text-sm text-slate-500">Không tìm thấy người dùng phù hợp.</p>}
                  {!vm.isSearching && vm.results.map((user) => (
                    <div className="flex items-center gap-3 rounded-xl p-2 hover:bg-palette-100/70 dark:hover:bg-white/5" key={user.id}>
                      <Avatar user={user} />
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold text-palette-900 dark:text-white">{user.fullName}</p><p className="truncate text-xs text-slate-500 dark:text-slate-300">@{user.username}</p></div>
                      <button className="secondary-button min-h-11 !p-3" disabled={collaboratorIds.has(user.id)} onClick={() => vm.requestShare(user)} type="button">{collaboratorIds.has(user.id) ? 'Đã thêm' : 'Thêm'}</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5">
              <h3 className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-300">Người có quyền truy cập</h3>
              {vm.owner && <div className="mt-2 flex items-center gap-3 rounded-xl p-2"><Avatar user={vm.owner} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold text-palette-900 dark:text-white">{vm.owner.fullName}</p><p className="truncate text-xs text-slate-500 dark:text-slate-300">@{vm.owner.username}</p></div><span className="text-xs font-bold text-slate-500 dark:text-slate-300">Chủ sở hữu</span></div>}
              <div className="space-y-1">
                {vm.collaborators.map((user) => (
                  <div className="flex flex-wrap items-center gap-3 rounded-xl p-2 hover:bg-palette-100/60 dark:hover:bg-white/5" key={user.id}>
                    <Avatar user={user} />
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold text-palette-900 dark:text-white">{user.fullName}{user.isCurrentUser ? ' (Bạn)' : ''}</p><p className="truncate text-xs text-slate-500 dark:text-slate-300">@{user.username}</p></div>
                    <GlassSelect ariaLabel={`Quyền của ${user.fullName}`} className="min-w-32 text-xs" disabled={user.isCurrentUser} onChange={(permission) => vm.requestPermissionChange(user, permission)} options={permissionOptions} value={user.permission} />
                    <button aria-label={`Thu hồi quyền của ${user.fullName}`} className="grid size-11 place-items-center rounded-full text-red-600 transition hover:bg-red-50 disabled:opacity-40 dark:text-red-300 dark:hover:bg-red-950/30" disabled={user.isCurrentUser} onClick={() => vm.requestRemove(user)} type="button"><NoteActionIcon name="trash" /></button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </section>

      {vm.pendingAction && (
        <NoteConfirmDialog confirmLabel={vm.pendingAction.type === 'remove' ? 'Thu hồi quyền' : 'Xác nhận chia sẻ'} description={pendingDescription} icon={<NoteActionIcon name={vm.pendingAction.type === 'remove' ? 'trash' : 'share'} />} isBusy={vm.isSaving} onCancel={vm.cancelPendingAction} onConfirm={() => void vm.confirmAction()} title={vm.pendingAction.type === 'remove' ? 'Thu hồi quyền truy cập?' : 'Xác nhận quyền truy cập?'} />
      )}
    </div>
  )
}

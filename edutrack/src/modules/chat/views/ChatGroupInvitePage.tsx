import { ChatActionIcon } from '../components/ChatActionIcon'
import { useChatGroupInviteViewModel } from '../viewmodels/useChatGroupInviteViewModel'

export function ChatGroupInvitePage() {
  const vm = useChatGroupInviteViewModel()
  if (vm.isLoading) return <div className="content-card mx-auto h-72 max-w-xl animate-pulse" aria-label="Đang kiểm tra liên kết" />
  if (vm.loadError || !vm.preview) return (
    <section className="content-card mx-auto max-w-xl p-6 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-300">!</span>
      <h1 className="mt-4 text-xl font-black text-palette-900 dark:text-white">Không thể sử dụng liên kết</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{vm.loadError}</p>
      <div className="mt-5 flex justify-center gap-3"><button className="secondary-button" onClick={vm.goToChat} type="button">Về trang nhóm</button><button className="primary-button" onClick={() => void vm.retry()} type="button">Thử lại</button></div>
    </section>
  )

  const { group, alreadyMember, invitedDirectly } = vm.preview
  return (
    <section className="content-card mx-auto max-w-xl p-5 text-center sm:p-8">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-palette-100 text-palette-700 dark:bg-white/10 dark:text-palette-200"><ChatActionIcon className="size-7" name="group" /></span>
      <p className="mt-4 text-xs font-bold text-palette-700 dark:text-palette-200">Lời mời tham gia nhóm</p>
      <h1 className="mt-1 break-words text-2xl font-black text-palette-900 dark:text-white">{group.name}</h1>
      {group.description && <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{group.description}</p>}
      <div className="mt-5 grid grid-cols-2 gap-3 text-left"><div className="rounded-xl bg-palette-100/70 p-3 dark:bg-white/5"><p className="text-xs text-slate-500 dark:text-slate-300">Thành viên</p><p className="mt-1 font-extrabold text-palette-900 dark:text-white">{group.memberCount}</p></div><div className="rounded-xl bg-palette-100/70 p-3 dark:bg-white/5"><p className="text-xs text-slate-500 dark:text-slate-300">Lịch sử</p><p className="mt-1 font-extrabold text-palette-900 dark:text-white">{group.historyVisibility === 'all' ? 'Toàn bộ' : 'Từ lúc tham gia'}</p></div></div>
      {invitedDirectly && !alreadyMember && <p className="mt-4 text-sm font-semibold text-palette-700 dark:text-palette-200">Bạn đã được mời trực tiếp vào nhóm này.</p>}
      <button className="primary-button mt-6 w-full" disabled={vm.isJoining} onClick={() => void vm.join()} type="button">{vm.isJoining ? 'Đang tham gia…' : alreadyMember ? 'Mở nhóm' : 'Tham gia nhóm'}</button>
    </section>
  )
}

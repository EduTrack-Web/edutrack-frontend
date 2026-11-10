import { formatAvatarUrl } from '@/shared/api/httpClient'
import { ChatActionIcon } from '@/modules/chat/components/ChatActionIcon'
import type { ChatGroupMemberItem } from '@/modules/chat/models/chat.types'
import { useChatGroupViewModel } from '@/modules/chat/viewmodels/useChatGroupViewModel'

const roleLabel = { owner: 'Trưởng nhóm', manager: 'Phó nhóm', member: 'Thành viên' } as const

export function ChatGroupPage() {
  const vm = useChatGroupViewModel()
  if (vm.isLoading) return <div className="content-card mx-auto h-80 max-w-5xl animate-pulse" aria-label="Đang tải nhóm" />
  if (vm.loadError || !vm.group) return (
    <section className="content-card mx-auto max-w-xl p-6 text-center">
      <h1 className="text-xl font-black text-palette-900 dark:text-white">Không thể mở nhóm</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{vm.loadError}</p>
      <div className="mt-5 flex justify-center gap-3"><button className="secondary-button" onClick={vm.goBack} type="button">Về danh sách</button><button className="primary-button" onClick={() => void vm.retry()} type="button">Thử lại</button></div>
    </section>
  )

  const group = vm.group
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 sm:space-y-6">
      <section className="content-card p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <button aria-label="Trở lại danh sách nhóm" className="grid size-11 shrink-0 place-items-center rounded-xl text-palette-900 hover:bg-palette-100 dark:text-white dark:hover:bg-white/10" onClick={vm.goBack} type="button"><ChatActionIcon name="back" /></button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-palette-700 dark:text-palette-200">{roleLabel[group.role]}</p>
            <h1 className="mt-1 break-words text-2xl font-black text-palette-900 sm:text-3xl dark:text-white">{group.name}</h1>
            {group.description && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">{group.description}</p>}
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <InfoTile label="Thành viên" value={String(group.memberCount)} />
          <InfoTile label="Đang chờ" value={String(group.pendingInvitationCount)} />
          <InfoTile label="Lịch sử" value={group.historyVisibility === 'all' ? 'Toàn bộ' : 'Từ lúc tham gia'} />
        </div>
      </section>

      {group.canManageInvites && <section className="content-card p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="font-extrabold text-palette-900 dark:text-white">Liên kết tham gia nhóm</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-300">Mỗi liên kết có hiệu lực 7 ngày. Tạo mới sẽ thu hồi liên kết cũ.</p></div>
          <button className="primary-button shrink-0" disabled={vm.isCreatingInvite} onClick={() => void vm.createInviteLink()} type="button"><ChatActionIcon className="size-4" name="plus" />{vm.isCreatingInvite ? 'Đang tạo…' : vm.invite ? 'Tạo liên kết mới' : 'Tạo liên kết'}</button>
        </div>
        {vm.invite && <div className="mt-4 rounded-xl border border-palette-200/70 bg-white/60 p-3 dark:border-white/10 dark:bg-white/5">
          <p className="break-all text-sm font-semibold text-palette-900 dark:text-white">{vm.invite.url}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3"><button className="secondary-button min-h-11 !rounded-xl !px-4 !py-2" onClick={() => void vm.copyInvite()} type="button"><ChatActionIcon className="size-4" name="copy" />Sao chép</button><span className="text-xs text-slate-500 dark:text-slate-300">Hết hạn {new Date(vm.invite.expiresAt).toLocaleString('vi-VN')}</span></div>
        </div>}
      </section>}

      <section className="content-card p-4 sm:p-6">
        <h2 className="text-lg font-black text-palette-900 dark:text-white">Thành viên</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">{group.members.map((member) => <MemberCard key={member.user.id} member={member} />)}</div>
      </section>

      {group.canManageInvites && group.invitations.length > 0 && <section className="content-card p-4 sm:p-6">
        <h2 className="text-lg font-black text-palette-900 dark:text-white">Đang được mời</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">Những tài khoản này chưa có quyền đọc nội dung hoặc nhận tin nhắn nhóm.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">{group.invitations.map((invitation) => <MemberCard key={invitation.id} member={{ role: 'member', joinedAt: invitation.createdAt, user: invitation.user }} pending />)}</div>
      </section>}
    </div>
  )
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-palette-100/70 p-3 dark:bg-white/5"><p className="text-xs font-bold text-slate-500 dark:text-slate-300">{label}</p><p className="mt-1 font-extrabold text-palette-900 dark:text-white">{value}</p></div>
}

function MemberCard({ member, pending = false }: { member: ChatGroupMemberItem; pending?: boolean }) {
  const avatarUrl = formatAvatarUrl(member.user.avatarUrl)
  return <article className="flex min-w-0 items-center gap-3 rounded-xl border border-palette-200/70 bg-white/60 p-3 dark:border-white/10 dark:bg-white/5">
    {avatarUrl ? <img alt="" className="size-11 shrink-0 rounded-full object-cover" src={avatarUrl} /> : <span className="grid size-11 shrink-0 place-items-center rounded-full bg-palette-200 font-black text-palette-900">{member.user.fullName.charAt(0).toUpperCase()}</span>}
    <div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold text-palette-900 dark:text-white">{member.user.fullName}</p><p className="truncate text-xs text-slate-500 dark:text-slate-300">@{member.user.username} · {pending ? 'Chờ tham gia' : roleLabel[member.role]}</p></div>
  </article>
}

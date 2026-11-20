import { Check, LoaderCircle, X } from 'lucide-react'

import { ChatActionIcon } from '@/modules/chat/components/ChatActionIcon'
import type { ChatUserSummary, FriendSearchResult } from '@/modules/chat/models/chat.types'
import { CHAT_GROUP_NAME_MAX_LENGTH } from '@/modules/chat/models/chatGroupValidation'
import { useCreateChatGroupViewModel } from '@/modules/chat/viewmodels/useCreateChatGroupViewModel'
import { formatAvatarUrl } from '@/shared/api/httpClient'

interface CreateChatGroupDialogProps {
  friends: ChatUserSummary[]
  onClose: () => void
}

export function CreateChatGroupDialog({ friends, onClose }: CreateChatGroupDialogProps) {
  const vm = useCreateChatGroupViewModel(friends, onClose)
  const selectedIds = new Set(vm.selectedUsers.map((user) => user.id))
  const fieldClass = (field: string) => `min-h-11 w-full rounded-xl border bg-white/75 px-3 py-2 text-sm text-palette-900 outline-none transition dark:bg-palette-900/60 dark:text-white ${vm.fieldErrors[field] ? 'border-red-500 focus:ring-3 focus:ring-red-200/40' : 'border-palette-200/80 focus:border-palette-700 focus:ring-3 focus:ring-palette-200/40 dark:border-white/15'}`

  return (
    <div className="fixed inset-0 z-50 flex justify-center overflow-y-auto bg-palette-950/30 p-2 backdrop-blur-[2px] sm:p-4" onMouseDown={() => { if (!vm.isSubmitting) onClose() }} role="presentation">
      <section aria-labelledby="create-chat-group-title" aria-modal="true" className="content-card my-auto flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-full max-w-3xl min-h-0 flex-col overflow-hidden p-0 sm:h-auto sm:max-h-[calc(100dvh-2rem)]" onMouseDown={(event) => event.stopPropagation()} role="dialog">
        {/* Header cố định */}
        <div className="flex shrink-0 items-center gap-3 border-b border-palette-200/60 px-2 py-3 sm:px-3 dark:border-white/10">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-palette-100 text-palette-700 dark:bg-white/10 dark:text-palette-200"><ChatActionIcon className="size-5" name="group" /></span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg leading-tight font-black text-palette-900 sm:text-xl dark:text-white" id="create-chat-group-title">Tạo nhóm trò chuyện</h2>
          </div>
          <button aria-label="Đóng" className="grid size-11 shrink-0 place-items-center rounded-xl text-palette-900 transition hover:bg-palette-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-palette-700 dark:text-white dark:hover:bg-white/10" disabled={vm.isSubmitting} onClick={onClose} type="button"><X aria-hidden="true" className="size-5" /></button>
        </div>

        {/* Nội dung cuộn */}
        <form className="flex min-h-0 flex-1 flex-col overflow-hidden" id="create-chat-group-form" noValidate onSubmit={(event) => void vm.submit(event)}>
          <div className="shrink-0 px-2 pt-3 sm:px-3">
            <div>
              <label className="text-sm font-extrabold text-palette-900 dark:text-white" htmlFor="chat-group-name">Tên nhóm</label>
              <input aria-describedby={vm.fieldErrors.name ? 'chat-group-name-error' : undefined} aria-invalid={Boolean(vm.fieldErrors.name)} className={`${fieldClass('name')} mt-1.5`} id="chat-group-name" maxLength={CHAT_GROUP_NAME_MAX_LENGTH} onChange={(event) => vm.setName(event.target.value)} placeholder="Nhập tên nhóm" value={vm.name} />
              {vm.fieldErrors.name && <p className="mt-1 text-xs font-semibold text-red-600 dark:text-red-300" id="chat-group-name-error">{vm.fieldErrors.name}</p>}
            </div>

            <div className="mt-3">
              <label className="text-sm font-extrabold text-palette-900 dark:text-white" htmlFor="chat-group-member-search">Thêm thành viên</label>
              <div className="mt-1.5">
                <div className="relative">
                  <ChatActionIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500 dark:text-slate-300" name="search" />
                  <input aria-describedby={vm.fieldErrors.participantQuery ? 'chat-group-search-error' : undefined} aria-invalid={Boolean(vm.fieldErrors.participantQuery)} className={`${fieldClass('participantQuery')} pr-10 pl-9`} id="chat-group-member-search" onChange={(event) => vm.setParticipantQuery(event.target.value)} placeholder="Username hoặc email" value={vm.participantQuery} />
                  {vm.isSearching && <LoaderCircle aria-label="Đang tìm" className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-palette-700 dark:text-palette-200" />}
                  {vm.searchResults.length > 0 && <div className="absolute top-[calc(100%+4px)] right-0 left-0 z-20 max-h-56 space-y-1 overflow-y-auto rounded-2xl border border-palette-200/80 bg-white/96 p-2 shadow-xl backdrop-blur-xl dark:border-white/15 dark:bg-palette-950/96">
                    {vm.searchResults.map((user) => <MemberOption isSelected={selectedIds.has(user.id)} key={user.id} onToggle={() => vm.toggleUser(user)} subtitle={user.relation === 'friend' ? 'Bạn bè' : 'Sẽ nhận lời mời'} user={user} />)}
                  </div>}
                </div>
                {vm.fieldErrors.participantQuery && <p className="mt-1 text-xs font-normal text-red-600 dark:text-red-300" id="chat-group-search-error">{vm.fieldErrors.participantQuery}</p>}
              </div>
            </div>
          </div>

          <div className="mt-3 min-h-0 flex-1 overflow-hidden px-2 pb-2 sm:px-3 sm:pb-3">
            <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-2 md:h-auto md:grid-cols-[minmax(0,1fr)_minmax(14rem,0.65fr)] md:grid-rows-1 md:gap-3">
              <div className="flex min-h-0 flex-col rounded-2xl border border-palette-200/70 bg-white/45 p-2 dark:border-white/10 dark:bg-white/4">
                <div className="flex items-center justify-between gap-2 px-2 py-1">
                  <h3 className="text-xs font-extrabold tracking-wide text-palette-900 uppercase dark:text-white">Bạn bè</h3>
                </div>
                <div className="mt-1 min-h-0 flex-1 space-y-0.5 overflow-y-auto md:max-h-[min(28rem,calc(100dvh-19rem))]">
                  {vm.visibleFriends.map((friend) => <MemberOption isSelected={selectedIds.has(friend.id)} key={friend.id} onToggle={() => vm.toggleUser(friend)} subtitle="Bạn bè" user={friend} />)}
                  {vm.visibleFriends.length === 0 && <p className="px-2 py-5 text-center text-xs leading-5 text-slate-500 dark:text-slate-300">{friends.length === 0 ? 'Bạn chưa có bạn bè để thêm nhanh.' : 'Không có bạn bè khớp từ khóa.'}</p>}
                </div>
              </div>

              <div className="flex max-h-36 min-h-0 flex-col rounded-2xl border border-palette-200/70 bg-palette-50/70 p-2 md:max-h-none dark:border-white/10 dark:bg-white/4">
                <div className="flex items-center justify-between gap-2 px-2 py-1">
                  <h3 className="text-xs font-extrabold tracking-wide text-palette-900 uppercase dark:text-white">Đã chọn</h3>
                  <span className="flex items-center gap-1.5">
                    <span className="rounded-full bg-palette-200/70 px-2 py-0.5 text-xs font-black text-palette-900 dark:bg-white/10 dark:text-palette-100">{vm.selectedUsers.length}</span>
                    {vm.selectedUsers.length > 0 && <button className="min-h-11 rounded-lg px-2 text-[11px] font-bold text-palette-700 transition hover:bg-palette-100 focus-visible:outline-2 focus-visible:outline-palette-700 dark:text-palette-200 dark:hover:bg-white/10" onClick={vm.clearSelectedUsers} type="button">Bỏ tất cả</button>}
                  </span>
                </div>
                {/* Mobile: lưới avatar; Desktop: danh sách đầy đủ */}
                <div className="mt-1 md:hidden">
                  {vm.selectedUsers.length === 0
                    ? <p className="px-2 py-3 text-center text-xs leading-5 text-slate-500 dark:text-slate-300">Chưa chọn.</p>
                    : <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto px-1 py-1">
                        {vm.selectedUsers.map((user) => <SelectedMemberAvatar key={user.id} onRemove={() => vm.removeUser(user.id)} user={user} />)}
                      </div>
                  }
                </div>
                <div className="mt-1 hidden min-h-0 flex-1 space-y-0.5 overflow-y-auto md:block md:max-h-[min(28rem,calc(100dvh-19rem))]">
                  {vm.selectedUsers.map((user) => <SelectedMember key={user.id} onRemove={() => vm.removeUser(user.id)} user={user} />)}
                  {vm.selectedUsers.length === 0 && <p className="px-2 py-5 text-center text-xs leading-5 text-slate-500 dark:text-slate-300">Chưa chọn thành viên.</p>}
                </div>
              </div>
            </div>
            {vm.fieldErrors.participantIds && <p className="mt-1 text-xs font-semibold text-red-600 dark:text-red-300">{vm.fieldErrors.participantIds}</p>}
          </div>
        </form>

        <div className="flex shrink-0 flex-row gap-2 border-t border-palette-200/60 bg-white/45 px-2 py-2 backdrop-blur-xl sm:justify-end sm:px-3 sm:py-3 dark:border-white/10 dark:bg-palette-950/35">
          <button className="secondary-button flex-1 sm:flex-none" disabled={vm.isSubmitting} onClick={onClose} type="button">Hủy</button>
          <button className="primary-button flex-1 sm:flex-none" disabled={vm.isSubmitting} form="create-chat-group-form" type="submit"><ChatActionIcon className="size-4" name="plus" />{vm.isSubmitting ? 'Đang tạo…' : 'Tạo nhóm'}</button>
        </div>
      </section>
    </div>
  )
}

function MemberOption({ user, subtitle, isSelected, onToggle }: { user: ChatUserSummary | FriendSearchResult; subtitle: string; isSelected: boolean; onToggle: () => void }) {
  const avatarUrl = formatAvatarUrl(user.avatarUrl)
  return (
    <button aria-pressed={isSelected} className={`flex min-h-11 w-full min-w-0 items-center gap-2 rounded-xl px-2 py-1 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-palette-700 ${isSelected ? 'bg-palette-100 dark:bg-palette-700/35' : 'hover:bg-palette-100/70 dark:hover:bg-white/8'}`} onClick={onToggle} type="button">
      <span className={`grid size-4 shrink-0 place-items-center rounded-full border ${isSelected ? 'border-palette-900 bg-palette-900 text-white dark:border-palette-200 dark:bg-palette-200 dark:text-palette-950' : 'border-palette-500 bg-white/70 dark:border-palette-200 dark:bg-white/5'}`}>{isSelected && <Check aria-hidden="true" className="size-3" strokeWidth={3} />}</span>
      {avatarUrl ? <img alt="" className="size-9 shrink-0 rounded-full object-cover" src={avatarUrl} /> : <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-palette-200 text-xs font-black text-palette-900 dark:bg-white/12 dark:text-white">{user.fullName.charAt(0).toUpperCase()}</span>}
      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-extrabold text-palette-900 dark:text-white">{user.fullName}</span><span className="block truncate text-xs text-slate-500 dark:text-slate-300">@{user.username} · {subtitle}</span></span>
    </button>
  )
}

function SelectedMember({ user, onRemove }: { user: ChatUserSummary; onRemove: () => void }) {
  const avatarUrl = formatAvatarUrl(user.avatarUrl)
  return <div className="flex min-h-11 min-w-0 items-center gap-2 rounded-xl bg-white/70 pl-2 dark:bg-white/6">
    {avatarUrl ? <img alt="" className="size-8 shrink-0 rounded-full object-cover" src={avatarUrl} /> : <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-palette-200 text-xs font-black text-palette-900 dark:bg-white/12 dark:text-white">{user.fullName.charAt(0).toUpperCase()}</span>}
    <span className="min-w-0 flex-1 truncate text-xs font-bold text-palette-900 dark:text-white">{user.fullName}</span>
    <button aria-label={`Bỏ ${user.fullName}`} className="grid size-11 shrink-0 place-items-center rounded-xl text-slate-500 transition hover:bg-palette-100 hover:text-palette-900 focus-visible:outline-2 focus-visible:outline-palette-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white" onClick={onRemove} type="button"><X aria-hidden="true" className="size-4" /></button>
  </div>
}

function SelectedMemberAvatar({ user, onRemove }: { user: ChatUserSummary; onRemove: () => void }) {
  const avatarUrl = formatAvatarUrl(user.avatarUrl)
  return (
    <div className="relative">
      {avatarUrl
        ? <img alt={user.fullName} className="size-10 rounded-full object-cover ring-2 ring-white dark:ring-palette-800" src={avatarUrl} title={user.fullName} />
        : <span aria-hidden="true" className="grid size-10 place-items-center rounded-full bg-palette-200 text-xs font-black text-palette-900 ring-2 ring-white dark:bg-white/12 dark:text-white dark:ring-palette-800" title={user.fullName}>{user.fullName.charAt(0).toUpperCase()}</span>
      }
      <button
        aria-label={`Bỏ ${user.fullName}`}
        className="absolute -top-1 -right-1 grid size-4 place-items-center rounded-full bg-palette-700 text-white transition hover:bg-palette-900 focus-visible:outline-2 focus-visible:outline-palette-700 dark:bg-palette-400 dark:text-palette-950"
        onClick={onRemove}
        type="button"
      >
        <X aria-hidden="true" className="size-2.5" />
      </button>
    </div>
  )
}

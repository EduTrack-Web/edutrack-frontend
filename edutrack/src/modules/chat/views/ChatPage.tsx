import { BlockUserDialog } from '../components/BlockUserDialog'
import { ChatActionIcon } from '../components/ChatActionIcon'
import { ChatGroupCard } from '../components/ChatGroupCard'
import { ChatUserCard } from '../components/ChatUserCard'
import { CreateChatGroupDialog } from '../components/CreateChatGroupDialog'
import type { ChatFriendsTab, FriendSearchResult } from '../models/chat.types'
import { useChatViewModel } from '../viewmodels/useChatViewModel'

const primaryButtonClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-palette-900 to-palette-700 px-4 text-sm font-extrabold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50'
const secondaryButtonClass = 'inline-flex min-h-11 items-center justify-center rounded-xl border border-palette-200/80 bg-white/75 px-3 text-sm font-bold text-palette-900 transition hover:bg-palette-100/80 disabled:opacity-50 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15'
const dangerButtonClass = 'inline-flex min-h-11 items-center justify-center rounded-xl px-3 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-950/30'

const relationLabel = (user: FriendSearchResult): string => {
  if (user.relation === 'friend') return 'Đã là bạn bè'
  if (user.relation === 'incoming') return 'Đang chờ bạn phản hồi'
  if (user.relation === 'outgoing') return 'Đã gửi lời mời'
  return user.exactMatch ? 'Có thể gửi lời mời' : ''
}

export function ChatPage() {
  const vm = useChatViewModel()
  const tabs: Array<{ value: ChatFriendsTab; label: string; count: number }> = [
    { value: 'friends', label: 'Bạn bè', count: vm.friends.length },
    { value: 'requests', label: 'Lời mời', count: vm.incomingRequestCount },
    { value: 'blocked', label: 'Đã chặn', count: vm.blockedUsers.length },
  ]

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 sm:space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm font-bold text-palette-700 dark:text-palette-200">Trao đổi nhóm</p><h1 className="mt-1 text-2xl font-black tracking-tight text-palette-900 sm:text-3xl dark:text-white">Bạn bè và kết nối</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">Tìm đúng tài khoản bằng username hoặc email. Email không được hiển thị trong kết quả tìm kiếm.</p></div>
        <button className={primaryButtonClass} onClick={vm.openCreateGroup} type="button"><ChatActionIcon className="size-4" name="plus" />Tạo nhóm</button>
      </header>

      <section className="content-card p-4 sm:p-5" aria-labelledby="chat-groups-title">
        <div className="flex items-center gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-palette-100 text-palette-700 dark:bg-white/10 dark:text-palette-200"><ChatActionIcon name="group" /></span><div><h2 className="font-extrabold text-palette-900 dark:text-white" id="chat-groups-title">Nhóm của bạn</h2><p className="text-xs text-slate-500 dark:text-slate-300">Nhóm hoạt động ngay cả khi vẫn còn người được mời chưa tham gia.</p></div></div>
        {vm.groups.length > 0 ? <div className="mt-4 grid gap-3 md:grid-cols-2">{vm.groups.map((group) => <ChatGroupCard group={group} key={group.id} />)}</div> : <p className="mt-4 rounded-xl bg-palette-100/60 p-4 text-sm text-slate-600 dark:bg-white/5 dark:text-slate-300">Bạn chưa tham gia nhóm trò chuyện nào.</p>}
      </section>

      <section className="content-card p-4 sm:p-5" aria-labelledby="friend-search-title">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-palette-100 text-palette-700 dark:bg-white/10 dark:text-palette-200"><ChatActionIcon name="search" /></span>
          <div>
            <h2 className="font-extrabold text-palette-900 dark:text-white" id="friend-search-title">Tìm người</h2>
            <p className="text-xs text-slate-500 dark:text-slate-300">Bạn bè hỗ trợ tìm gần đúng; người lạ phải nhập đầy đủ username hoặc email.</p>
          </div>
        </div>
        <form className="mt-4 flex flex-col gap-2 sm:flex-row" noValidate onSubmit={(event) => { event.preventDefault(); void vm.search() }}>
          <div className="min-w-0 flex-1">
            <input aria-describedby={vm.queryError ? 'friend-query-error' : 'friend-query-hint'} aria-invalid={Boolean(vm.queryError)} className={`min-h-11 w-full rounded-xl border bg-white/75 px-3 text-sm text-palette-900 outline-none transition dark:bg-palette-900/60 dark:text-white ${vm.queryError ? 'border-red-500' : 'border-palette-200/80 focus:border-palette-700 dark:border-white/15'}`} maxLength={254} onChange={(event) => vm.setQuery(event.target.value)} placeholder="Nhập đầy đủ username hoặc email" value={vm.query} />
            {vm.queryError
              ? <p className="mt-1 text-xs font-semibold text-red-600 dark:text-red-300" id="friend-query-error">{vm.queryError}</p>
              : <p className="sr-only" id="friend-query-hint">Tìm gần đúng chỉ áp dụng trong danh sách bạn bè.</p>}
          </div>
          <button className={primaryButtonClass} disabled={vm.isSearching} type="submit"><ChatActionIcon className="size-4" name="search" />{vm.isSearching ? 'Đang tìm…' : 'Tìm kiếm'}</button>
        </form>

        {vm.searchResults.length > 0 && (
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {vm.searchResults.map((user) => (
              <ChatUserCard actions={<>
                {user.relation === 'none' && user.exactMatch && <button className={primaryButtonClass} disabled={Boolean(vm.busyId)} onClick={() => void vm.sendFriendRequest(user)} type="button"><ChatActionIcon className="size-4" name="send" />Kết bạn</button>}
                {(user.relation === 'friend' || user.relation === 'none') && <button className={dangerButtonClass} disabled={Boolean(vm.busyId)} onClick={() => vm.requestBlock(user)} type="button">Chặn</button>}
              </>} description={relationLabel(user)} key={user.id} user={user} />
            ))}
          </div>
        )}
        {!vm.isSearching && vm.hasSearched && vm.searchResults.length === 0 && !vm.queryError && <p className="mt-4 rounded-xl bg-palette-100/70 p-3 text-sm text-slate-600 dark:bg-white/5 dark:text-slate-300">Không tìm thấy tài khoản phù hợp. Người lạ chỉ xuất hiện khi username hoặc email khớp chính xác.</p>}
      </section>

      <section className="content-card overflow-hidden" aria-label="Quản lý bạn bè">
        <div className="flex gap-1 overflow-x-auto border-b border-palette-200/70 p-2 dark:border-white/10" role="tablist">
          {tabs.map((tab) => (
            <button aria-selected={vm.activeTab === tab.value} className={`min-h-11 shrink-0 rounded-xl px-4 text-sm font-extrabold transition ${vm.activeTab === tab.value ? 'bg-gradient-to-r from-palette-900 to-palette-700 text-white shadow-sm dark:bg-none dark:bg-palette-200 dark:text-palette-900' : 'text-palette-900 hover:bg-palette-100/70 dark:text-palette-100 dark:hover:bg-white/10'}`} key={tab.value} onClick={() => vm.setActiveTab(tab.value)} role="tab" type="button">{tab.label}{tab.count > 0 ? ` (${tab.count})` : ''}</button>
          ))}
          <button aria-label="Tải lại dữ liệu bạn bè" className="ml-auto grid size-11 shrink-0 place-items-center rounded-xl text-palette-700 transition hover:bg-palette-100 dark:text-palette-200 dark:hover:bg-white/10" disabled={vm.isLoading} onClick={() => void vm.reload()} type="button"><ChatActionIcon className={`size-5 ${vm.isLoading ? 'animate-spin' : ''}`} name="refresh" /></button>
        </div>

        <div className="p-4 sm:p-5">
          {vm.isLoading ? (
            <div className="grid gap-3 md:grid-cols-2">{[0, 1, 2, 3].map((item) => <div className="h-[70px] animate-pulse rounded-2xl bg-palette-100 dark:bg-white/5" key={item} />)}</div>
          ) : vm.activeTab === 'friends' ? (
            vm.friends.length > 0
              ? <div className="grid gap-3 md:grid-cols-2">{vm.friends.map((friend) => <ChatUserCard actions={<button className={dangerButtonClass} disabled={Boolean(vm.busyId)} onClick={() => vm.requestBlock(friend)} type="button">Chặn</button>} key={friend.id} user={friend} />)}</div>
              : <EmptyState icon="friends" message="Bạn chưa có bạn bè. Hãy tìm bằng username hoặc email để gửi lời mời." />
          ) : vm.activeTab === 'requests' ? (
            vm.requests.length > 0
              ? <div className="grid gap-3 md:grid-cols-2">{vm.requests.map((request) => <ChatUserCard actions={<>{request.direction === 'incoming' && <><button className={primaryButtonClass} disabled={Boolean(vm.busyId)} onClick={() => void vm.acceptRequest(request)} type="button">Chấp nhận</button><button className={secondaryButtonClass} disabled={Boolean(vm.busyId)} onClick={() => void vm.declineRequest(request)} type="button">Từ chối</button></>}<button className={dangerButtonClass} disabled={Boolean(vm.busyId)} onClick={() => vm.requestBlock(request.user)} type="button">Chặn</button></>} description={request.direction === 'incoming' ? 'Đã gửi lời mời cho bạn' : 'Đang chờ người dùng chấp nhận'} key={request.id} user={request.user} />)}</div>
              : <EmptyState icon="requests" message="Hiện không có lời mời kết bạn nào." />
          ) : (
            vm.blockedUsers.length > 0
              ? <div className="grid gap-3 md:grid-cols-2">{vm.blockedUsers.map((user) => <ChatUserCard actions={<button className={secondaryButtonClass} disabled={Boolean(vm.busyId)} onClick={() => void vm.unblock(user)} type="button">Bỏ chặn</button>} key={user.id} user={user} />)}</div>
              : <EmptyState icon="block" message="Bạn chưa chặn người dùng nào." />
          )}
        </div>
      </section>

      {vm.blockTarget && <BlockUserDialog isSaving={vm.busyId === vm.blockTarget.id} onCancel={vm.cancelBlock} onConfirm={() => void vm.confirmBlock()} user={vm.blockTarget} />}
      {vm.isCreateGroupOpen && <CreateChatGroupDialog onClose={vm.closeCreateGroup} />}
    </div>
  )
}

function EmptyState({ icon, message }: { icon: 'friends' | 'requests' | 'block'; message: string }) {
  return (
    <div className="flex flex-col items-center py-10 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-palette-100 text-palette-700 dark:bg-white/10 dark:text-palette-200"><ChatActionIcon name={icon} /></span>
      <p className="mt-3 max-w-md text-sm text-slate-600 dark:text-slate-300">{message}</p>
    </div>
  )
}

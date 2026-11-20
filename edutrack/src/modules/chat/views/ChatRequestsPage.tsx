import { useState } from 'react'

import { BlockUserDialog } from '@/modules/chat/components/BlockUserDialog'
import { ChatUserCard } from '@/modules/chat/components/ChatUserCard'
import { ChatUserProfileDialog } from '@/modules/chat/components/ChatUserProfileDialog'
import { FriendRequestTime } from '@/modules/chat/components/FriendRequestTime'
import { useChatLayout } from '@/modules/chat/viewmodels/useChatLayout'
import { ChatEmptyState, ChatSectionHeader } from '@/modules/chat/views/ChatPage'

type RequestSection = 'received' | 'sent'

const primaryButtonClass = 'inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-palette-900 to-palette-700 px-3 text-xs font-extrabold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50'
const secondaryButtonClass = 'inline-flex min-h-11 items-center justify-center rounded-xl border border-palette-200/80 bg-white/75 px-3 text-xs font-bold text-palette-900 transition hover:bg-palette-100 disabled:opacity-50 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15'
const revokeButtonClass = 'inline-flex min-h-11 items-center justify-center rounded-xl border border-palette-200/80 bg-gradient-to-r from-palette-100 to-palette-200/65 px-3 text-xs font-bold text-palette-900 transition hover:brightness-95 disabled:opacity-50 dark:border-white/15 dark:from-white/10 dark:to-palette-700/25 dark:text-palette-100'

export function ChatRequestsPage() {
  const { vm } = useChatLayout()
  const [section, setSection] = useState<RequestSection>('received')
  const profileTarget = vm.profileTarget
  const profileConversation = profileTarget
    ? vm.directConversations.find((conversation) => conversation.participant.id === profileTarget.id)
    : undefined

  return (
    <main className="flex h-full min-h-0 flex-col bg-white/22 dark:bg-palette-950/10">
      <ChatSectionHeader description="Theo dõi lời mời đã nhận và đã gửi" icon="requests" title="Lời mời kết bạn" />

      <div className="shrink-0 border-b border-palette-200/70 px-2 sm:px-4 dark:border-white/10">
        <div className="flex gap-2" role="tablist" aria-label="Loại lời mời kết bạn">
          <RequestTab active={section === 'received'} count={vm.incomingRequestCount} label="Đã nhận" onClick={() => setSection('received')} />
          <RequestTab active={section === 'sent'} count={vm.outgoingRequestCount} label="Đã gửi" onClick={() => setSection('sent')} />
        </div>
      </div>

      <section className="min-h-0 flex-1 overflow-y-auto p-2 sm:p-4" role="tabpanel">
        {vm.isLoading ? (
          <div className="grid gap-2 xl:grid-cols-2">{[0, 1, 2, 3].map((item) => <div className="h-[76px] animate-pulse rounded-2xl bg-palette-100 dark:bg-white/5" key={item} />)}</div>
        ) : section === 'received' ? (
          vm.incomingRequests.length > 0
            ? <div className="grid gap-2 xl:grid-cols-2">{vm.incomingRequests.map((request) => <ChatUserCard actions={<><button className={primaryButtonClass} disabled={Boolean(vm.busyId)} onClick={() => void vm.acceptRequest(request)} type="button">Chấp nhận</button><button className={secondaryButtonClass} disabled={Boolean(vm.busyId)} onClick={() => void vm.declineRequest(request)} type="button">Từ chối</button></>} description={<>Đã gửi lời mời cho bạn · <FriendRequestTime createdAt={request.createdAt} /></>} key={request.id} onViewProfile={() => vm.openProfile(request.user)} user={request.user} />)}</div>
            : <ChatEmptyState icon="requests" message="Hiện không có lời mời kết bạn nào đang chờ bạn phản hồi." />
        ) : (
          vm.outgoingRequests.length > 0
            ? <div className="grid gap-2 xl:grid-cols-2">{vm.outgoingRequests.map((request) => <ChatUserCard actions={<button className={revokeButtonClass} disabled={Boolean(vm.busyId)} onClick={() => void vm.revokeRequest(request)} type="button">Thu hồi lời mời</button>} description={<>Đã gửi · <FriendRequestTime createdAt={request.createdAt} /></>} key={request.id} onViewProfile={() => vm.openProfile(request.user)} user={request.user} />)}</div>
            : <ChatEmptyState icon="send" message="Bạn chưa gửi yêu cầu kết bạn nào đang chờ phản hồi." />
        )}
      </section>

      {profileTarget && <ChatUserProfileDialog conversationPath={profileConversation ? `/chat/conversations/${profileConversation.id}` : undefined} isBlocking={Boolean(vm.busyId)} onBlock={() => vm.requestBlock(profileTarget)} onClose={vm.closeProfile} user={profileTarget} />}
      {vm.blockTarget && <BlockUserDialog isSaving={vm.busyId === vm.blockTarget.id} onCancel={vm.cancelBlock} onConfirm={() => void vm.confirmBlock()} user={vm.blockTarget} />}
    </main>
  )
}

function RequestTab({ active, count, label, onClick }: { active: boolean; count: number; label: string; onClick: () => void }) {
  return (
    <button aria-selected={active} className={`inline-flex min-h-11 items-center gap-2 border-b-2 px-2 text-sm font-extrabold transition ${active ? 'border-palette-700 text-palette-900 dark:border-palette-200 dark:text-white' : 'border-transparent text-slate-500 hover:text-palette-900 dark:text-slate-300 dark:hover:text-white'}`} onClick={onClick} role="tab" type="button">
      {label}
      {count > 0 && <span className={`grid min-w-5 place-items-center rounded-full px-1 text-[11px] leading-5 ${active ? 'bg-palette-200 text-palette-900 dark:bg-white/15 dark:text-white' : 'bg-slate-100 text-slate-600 dark:bg-white/8 dark:text-slate-300'}`}>{count}</span>}
    </button>
  )
}

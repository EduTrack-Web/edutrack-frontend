import { Link } from 'react-router-dom'

import { BlockUserDialog } from '@/modules/chat/components/BlockUserDialog'
import { ChatActionIcon } from '@/modules/chat/components/ChatActionIcon'
import { ChatUserProfileDialog } from '@/modules/chat/components/ChatUserProfileDialog'
import type { ChatUserSummary, DirectConversationSummary } from '@/modules/chat/models/chat.types'
import { useChatLayout } from '@/modules/chat/viewmodels/useChatLayout'
import { formatAvatarUrl } from '@/shared/api/httpClient'

const messageButtonClass = 'inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-palette-200/80 bg-white/75 px-3 text-xs font-extrabold text-palette-900 transition hover:bg-palette-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-palette-700 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15'

export function ChatPage() {
  const { vm } = useChatLayout()
  const conversationByParticipantId = new Map(
    vm.directConversations.map((conversation) => [conversation.participant.id, conversation]),
  )
  const profileTarget = vm.profileTarget
  const profileConversation = profileTarget
    ? conversationByParticipantId.get(profileTarget.id)
    : undefined

  return (
    <main className="flex h-full min-h-0 flex-col bg-white/22 dark:bg-palette-950/10">
      <ChatSectionHeader description={`${vm.friends.length} người bạn · Sắp xếp theo A–Z`} icon="contacts" title="Danh bạ" />

      <section aria-label="Danh sách danh bạ" className="min-h-0 flex-1 overflow-y-auto p-2 sm:p-4">
        {vm.isLoading ? (
          <div className="w-full space-y-2">{[0, 1, 2, 3, 4].map((item) => <div className="h-16 animate-pulse rounded-2xl bg-palette-100 dark:bg-white/5" key={item} />)}</div>
        ) : vm.contactSections.length > 0 ? (
          <div className="w-full space-y-4">
            {vm.contactSections.map((section) => (
              <section className="relative pt-7" key={section.initial}>
                <h2 className="absolute top-0 right-2 grid h-7 min-w-7 place-items-center rounded-full bg-palette-100/85 px-2 text-xs font-black text-palette-700 dark:bg-white/10 dark:text-palette-200">{section.initial}</h2>
                <div className="overflow-hidden rounded-2xl border border-palette-200/70 bg-white/55 dark:border-white/10 dark:bg-white/5">
                  {section.users.map((friend, index) => (
                    <ContactRow
                      conversation={conversationByParticipantId.get(friend.id)}
                      isLast={index === section.users.length - 1}
                      key={friend.id}
                      onViewProfile={() => vm.openProfile(friend)}
                      user={friend}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <ChatEmptyState icon="friends" message="Bạn chưa có bạn bè. Hãy tìm bằng username hoặc email trong ô tìm kiếm đoạn chat để gửi lời mời." />
        )}
      </section>

      {profileTarget && <ChatUserProfileDialog conversationPath={profileConversation ? `/chat/conversations/${profileConversation.id}` : undefined} isBlocking={Boolean(vm.busyId)} onBlock={() => vm.requestBlock(profileTarget)} onClose={vm.closeProfile} user={profileTarget} />}
      {vm.blockTarget && <BlockUserDialog isSaving={vm.busyId === vm.blockTarget.id} onCancel={vm.cancelBlock} onConfirm={() => void vm.confirmBlock()} user={vm.blockTarget} />}
    </main>
  )
}

export function ChatSectionHeader({ title, description, icon }: { title: string; description: string; icon: 'contacts' | 'requests' | 'settings' }) {
  return (
    <header className="flex min-h-16 shrink-0 items-center gap-2 border-b border-palette-200/70 px-2 py-2 sm:gap-3 sm:px-4 dark:border-white/10">
      <Link aria-label="Trở lại danh sách đoạn chat" className="grid size-11 shrink-0 place-items-center rounded-full text-palette-900 transition hover:bg-palette-100 focus-visible:outline-2 focus-visible:outline-palette-700 lg:hidden dark:text-white dark:hover:bg-white/10" to="/chat"><ChatActionIcon name="back" /></Link>
      <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-palette-100 text-palette-700 dark:bg-white/10 dark:text-palette-200"><ChatActionIcon name={icon} /></span>
      <div className="min-w-0">
        <h1 className="truncate text-lg font-black text-palette-900 dark:text-white">{title}</h1>
        <p className="truncate text-xs text-slate-500 dark:text-slate-300">{description}</p>
      </div>
    </header>
  )
}

function ContactRow({ user, conversation, isLast, onViewProfile }: { user: ChatUserSummary; conversation?: DirectConversationSummary; isLast: boolean; onViewProfile: () => void }) {
  const avatarUrl = formatAvatarUrl(user.avatarUrl)

  return (
    <article className={`flex min-w-0 items-center gap-2 p-2 sm:px-3 ${isLast ? '' : 'border-b border-palette-200/60 dark:border-white/8'}`}>
      <button aria-label={`Xem thông tin tài khoản ${user.fullName}`} className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-palette-700" onClick={onViewProfile} type="button">
        {avatarUrl
          ? <img alt="" className="size-11 shrink-0 rounded-full object-cover" src={avatarUrl} />
          : <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full bg-palette-200 text-sm font-black text-palette-900 dark:bg-white/15 dark:text-white">{user.fullName.trim().charAt(0).toUpperCase()}</span>}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-extrabold text-palette-900 dark:text-white">{user.fullName}</span>
          <span className="block truncate text-xs text-slate-500 dark:text-slate-300">@{user.username}</span>
        </span>
      </button>
      {conversation && <Link className={messageButtonClass} to={`/chat/conversations/${conversation.id}`}>Nhắn tin</Link>}
    </article>
  )
}

export function ChatEmptyState({ icon, message }: { icon: 'friends' | 'requests' | 'send' | 'block' | 'settings'; message: string }) {
  return (
    <div className="flex flex-col items-center py-10 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-palette-100 text-palette-700 dark:bg-white/10 dark:text-palette-200"><ChatActionIcon name={icon} /></span>
      <p className="mt-3 max-w-md text-sm text-slate-600 dark:text-slate-300">{message}</p>
    </div>
  )
}

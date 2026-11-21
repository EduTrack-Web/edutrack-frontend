import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'

import { ChatActionIcon } from '@/modules/chat/components/ChatActionIcon'
import { ChatGroupCard } from '@/modules/chat/components/ChatGroupCard'
import { ChatPresenceAvatar } from '@/modules/chat/components/ChatPresence'
import type {
  ChatGroupSummary,
  ChatMessageSearchResult,
  DirectConversationSummary,
  FriendSearchResult,
} from '@/modules/chat/models/chat.types'
import {
  useChatSidebarSearchViewModel,
  type ChatSearchTab,
} from '@/modules/chat/viewmodels/useChatSidebarSearchViewModel'
import { formatAvatarUrl } from '@/shared/api/httpClient'
import { formatConversationListTime } from '@/modules/chat/models/conversationListTime'
import { useTranslation } from '@/modules/i18n/viewmodels/useTranslation'

interface ChatGroupSidebarProps {
  groups: ChatGroupSummary[]
  directConversations: DirectConversationSummary[]
  currentGroupId?: string
  currentDirectConversationId?: string
  isLoading?: boolean
  onCreateGroup?: () => void
  onFriendRequestSent?: () => void | Promise<void>
  incomingRequestCount?: number
  outgoingRequestCount?: number
}

const searchTabs: Array<{ value: ChatSearchTab; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'contacts', label: 'Liên hệ' },
  { value: 'messages', label: 'Tin nhắn' },
]

type ConversationFilter = 'all' | 'friends' | 'groups'

const conversationFilters: Array<{ value: ConversationFilter; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'friends', label: 'Bạn bè' },
  { value: 'groups', label: 'Nhóm' },
]

export function ChatGroupSidebar({
  groups,
  directConversations,
  currentGroupId,
  currentDirectConversationId,
  isLoading = false,
  onCreateGroup,
  onFriendRequestSent,
  incomingRequestCount = 0,
  outgoingRequestCount = 0,
}: ChatGroupSidebarProps) {
  const location = useLocation()
  const sidebarRef = useRef<HTMLElement>(null)
  const moreButtonRef = useRef<HTMLButtonElement>(null)
  const moreMenuRef = useRef<HTMLDivElement>(null)
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false)
  const [moreMenuPosition, setMoreMenuPosition] = useState({ left: 8, top: 8, width: 240 })
  const [conversationFilter, setConversationFilter] = useState<ConversationFilter>('all')
  const search = useChatSidebarSearchViewModel({
    groups,
    directConversations,
    onFriendRequestSent,
  })
  const invitationCount = incomingRequestCount + outgoingRequestCount
  const activeSection = location.pathname.startsWith('/chat/contacts')
    ? 'contacts'
    : location.pathname.startsWith('/chat/requests')
      ? 'requests'
      : location.pathname.startsWith('/chat/settings')
        ? 'settings'
        : 'conversations'

  useEffect(() => {
    if (!isMoreMenuOpen) return undefined
    const closeOnOutside = (event: PointerEvent) => {
      const target = event.target as Node
      if (!moreButtonRef.current?.contains(target) && !moreMenuRef.current?.contains(target)) setIsMoreMenuOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMoreMenuOpen(false)
    }
    const closeOnViewportChange = () => setIsMoreMenuOpen(false)
    document.addEventListener('pointerdown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    window.addEventListener('resize', closeOnViewportChange)
    window.addEventListener('scroll', closeOnViewportChange, true)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
      window.removeEventListener('resize', closeOnViewportChange)
      window.removeEventListener('scroll', closeOnViewportChange, true)
    }
  }, [isMoreMenuOpen])

  const toggleMoreMenu = () => {
    if (isMoreMenuOpen) {
      setIsMoreMenuOpen(false)
      return
    }

    const buttonRect = moreButtonRef.current?.getBoundingClientRect()
    const sidebarRect = sidebarRef.current?.getBoundingClientRect()
    if (buttonRect && sidebarRect) {
      const margin = 8
      const gap = 8
      const estimatedHeight = 148
      const width = Math.min(240, window.innerWidth - margin * 2)
      const left = Math.min(
        Math.max(margin, sidebarRect.right - width - margin),
        window.innerWidth - width - margin,
      )
      const preferredTop = buttonRect.bottom + gap
      const top = preferredTop + estimatedHeight <= window.innerHeight - margin
        ? preferredTop
        : Math.max(margin, buttonRect.top - estimatedHeight - gap)
      setMoreMenuPosition({ left, top, width })
    }
    setIsMoreMenuOpen(true)
  }

  return (
    <aside className="flex h-full min-h-0 flex-col border-b border-palette-200/70 bg-white/38 lg:border-r lg:border-b-0 dark:border-white/10 dark:bg-palette-950/20" aria-label="Danh sách đoạn chat và tìm kiếm" ref={sidebarRef}>
      <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-black text-palette-900 dark:text-white">Trò chuyện</h1>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <div>
            <button aria-expanded={isMoreMenuOpen} aria-haspopup="menu" aria-label="Mở cài đặt trò chuyện" className="grid size-11 place-items-center rounded-full text-palette-900 transition hover:bg-palette-100/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-palette-700 dark:text-white dark:hover:bg-white/10" onClick={toggleMoreMenu} ref={moreButtonRef} title="Tùy chọn" type="button"><ChatActionIcon name="more" /></button>
            {isMoreMenuOpen && createPortal(
              <div className="fixed z-[90] rounded-2xl border border-palette-200/80 bg-white/95 p-1.5 shadow-xl backdrop-blur-xl dark:border-white/15 dark:bg-palette-950/95" ref={moreMenuRef} role="menu" style={moreMenuPosition}>
                <Link className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold text-palette-900 transition hover:bg-palette-100 dark:text-white dark:hover:bg-white/10" onClick={() => setIsMoreMenuOpen(false)} role="menuitem" to="/chat/settings#activity"><ChatActionIcon className="size-4" name="activity" />Trạng thái hoạt động</Link>
                <Link className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold text-palette-900 transition hover:bg-palette-100 dark:text-white dark:hover:bg-white/10" onClick={() => setIsMoreMenuOpen(false)} role="menuitem" to="/chat/settings#blocked"><ChatActionIcon className="size-4" name="block" />Danh sách chặn</Link>
                <Link className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold text-palette-900 transition hover:bg-palette-100 dark:text-white dark:hover:bg-white/10" onClick={() => setIsMoreMenuOpen(false)} role="menuitem" to="/chat/settings"><ChatActionIcon className="size-4" name="settings" />Cài đặt trò chuyện</Link>
              </div>,
              document.body,
            )}
          </div>
          {onCreateGroup && <button aria-label="Tạo nhóm mới" className="grid size-11 place-items-center rounded-full bg-gradient-to-br from-palette-900 to-palette-700 text-white shadow-sm transition hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-palette-700" onClick={onCreateGroup} title="Tạo nhóm" type="button"><ChatActionIcon name="groupPlus" /></button>}
        </div>
      </div>

      <nav aria-label="Khu vực trao đổi" className="mx-3 mb-2 grid grid-cols-[1.2fr_1fr_1fr] gap-1 rounded-2xl border border-palette-200/70 bg-white/45 p-1 dark:border-white/10 dark:bg-white/5">
        <SidebarNavLink active={activeSection === 'conversations'} icon="message" label="Trò chuyện" to="/chat" />
        <SidebarNavLink active={activeSection === 'contacts'} icon="contacts" label="Danh bạ" to="/chat/contacts" />
        <SidebarNavLink active={activeSection === 'requests'} badge={invitationCount} icon="requests" label="Lời mời" to="/chat/requests" />
      </nav>

      <div className="px-3 pb-2">
        <label className="relative block">
          <span className="sr-only">Tìm tài khoản, đoạn chat hoặc tin nhắn</span>
          <ChatActionIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500 dark:text-slate-300" name="search" />
          <input
            aria-describedby={search.queryError ? 'chat-search-error' : undefined}
            aria-invalid={Boolean(search.queryError)}
            className={`min-h-11 w-full rounded-xl border bg-white/72 py-2 pr-10 pl-9 text-sm text-palette-900 outline-none transition placeholder:text-slate-500 focus:ring-3 dark:bg-white/7 dark:text-white dark:placeholder:text-slate-400 ${search.queryError ? 'border-red-500 focus:ring-red-200/40' : 'border-palette-200/75 focus:border-palette-700 focus:ring-palette-200/45 dark:border-white/12 dark:focus:border-palette-500'}`}
            maxLength={254}
            onChange={(event) => search.setQuery(event.target.value)}
            placeholder="Tìm kiếm"
            value={search.query}
          />
          {search.query && <button aria-label="Xóa từ khóa tìm kiếm" className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-full text-lg font-bold text-slate-500 transition hover:bg-palette-100 hover:text-palette-900 focus-visible:outline-2 focus-visible:outline-palette-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white" onClick={search.clearQuery} type="button">×</button>}
        </label>
        {search.queryError && <p className="mt-1.5 px-1 text-xs font-normal leading-5 text-red-600 dark:text-red-300" id="chat-search-error">{search.queryError}</p>}
      </div>

      {search.isSearchMode && !search.queryError && (
        <div className="flex gap-1 overflow-x-auto border-b border-palette-200/70 px-3 dark:border-white/10" role="tablist">
          {searchTabs.map((tab) => <button aria-selected={search.activeTab === tab.value} className={`min-h-10 shrink-0 border-b-2 px-2 text-xs font-extrabold transition ${search.activeTab === tab.value ? 'border-palette-700 text-palette-900 dark:border-palette-200 dark:text-white' : 'border-transparent text-slate-500 hover:text-palette-900 dark:text-slate-300 dark:hover:text-white'}`} key={tab.value} onClick={() => search.setActiveTab(tab.value)} role="tab" type="button">{tab.label}</button>)}
        </div>
      )}

      {!search.isSearchMode && (
        <div className="flex gap-1 overflow-x-auto border-b border-palette-200/70 px-3 dark:border-white/10" role="tablist" aria-label="Lọc đoạn chat">
          {conversationFilters.map((filter) => <button aria-selected={conversationFilter === filter.value} className={`min-h-10 shrink-0 border-b-2 px-2 text-xs font-extrabold transition ${conversationFilter === filter.value ? 'border-palette-700 text-palette-900 dark:border-palette-200 dark:text-white' : 'border-transparent text-slate-500 hover:text-palette-900 dark:text-slate-300 dark:hover:text-white'}`} key={filter.value} onClick={() => setConversationFilter(filter.value)} role="tab" type="button">{filter.label}</button>)}
        </div>
      )}

      <div className="min-h-0 space-y-1 overflow-y-auto px-2 pb-3 lg:flex-1">
        {search.isSearchMode
          ? <SearchResults
            activeTab={search.activeTab}
            accountResults={search.accountResults}
            busyUserId={search.busyUserId}
            currentDirectConversationId={currentDirectConversationId}
            currentGroupId={currentGroupId}
            directConversations={search.matchedDirectConversations}
            availableDirectConversations={directConversations}
            groups={search.matchedGroups}
            hasResults={search.hasResults}
            isSearching={search.isSearching}
            messageResults={search.messageResults}
            noResultMessage={search.noResultMessage}
            onSendFriendRequest={search.sendFriendRequest}
            queryError={search.queryError}
          />
          : <ConversationList
            currentDirectConversationId={currentDirectConversationId}
            currentGroupId={currentGroupId}
            directConversations={directConversations}
            filter={conversationFilter}
            groups={groups}
            isLoading={isLoading}
          />}
      </div>
    </aside>
  )
}

function SidebarNavLink({ active, badge = 0, icon, label, to }: { active: boolean; badge?: number; icon: 'message' | 'contacts' | 'requests'; label: string; to: string }) {
  return (
    <Link
      aria-current={active ? 'page' : undefined}
      className={`relative inline-flex min-h-10 min-w-0 items-center justify-center gap-1 rounded-xl px-1.5 text-[11px] font-extrabold transition ${active ? 'bg-gradient-to-r from-palette-900 to-palette-700 text-white shadow-sm' : 'text-palette-900 hover:bg-palette-100/70 dark:text-palette-100 dark:hover:bg-white/10'}`}
      to={to}
    >
      <ChatActionIcon className="size-3.5 shrink-0" name={icon} />
      <span className="whitespace-nowrap">{label}</span>
      {badge > 0 && <span className={`grid min-w-4 place-items-center rounded-full px-1 text-[10px] leading-4 ${active ? 'bg-white/20' : 'bg-palette-200 text-palette-900 dark:bg-white/15 dark:text-white'}`}>{badge > 99 ? '99+' : badge}</span>}
    </Link>
  )
}

interface ConversationListProps {
  groups: ChatGroupSummary[]
  directConversations: DirectConversationSummary[]
  currentGroupId?: string
  currentDirectConversationId?: string
  isLoading: boolean
  filter: ConversationFilter
}

function ConversationList({ groups, directConversations, currentGroupId, currentDirectConversationId, isLoading, filter }: ConversationListProps) {
  if (isLoading) return <>{[0, 1, 2, 3].map((item) => <div className="mx-1 h-16 animate-pulse rounded-2xl bg-palette-100/80 dark:bg-white/5" key={item} />)}</>
  if (directConversations.length === 0 && groups.length === 0) return <EmptySearchState message="Bạn chưa có cuộc trò chuyện nào." />
  const items = [
    ...(filter === 'groups' ? [] : directConversations.map((conversation) => ({ kind: 'friend' as const, item: conversation, updatedAt: conversation.updatedAt }))),
    ...(filter === 'friends' ? [] : groups.map((group) => ({ kind: 'group' as const, item: group, updatedAt: group.updatedAt }))),
  ].sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))

  if (items.length === 0) {
    return <EmptySearchState message={filter === 'friends' ? 'Bạn chưa có đoạn chat bạn bè nào.' : 'Bạn chưa tham gia nhóm trò chuyện nào.'} />
  }

  return <div className="space-y-1 pt-2">
    {items.map((entry) => entry.kind === 'friend'
      ? <DirectConversationCard active={entry.item.id === currentDirectConversationId} conversation={entry.item} key={`friend-${entry.item.id}`} />
      : <ChatGroupCard active={entry.item.id === currentGroupId} group={entry.item} key={`group-${entry.item.id}`} />)}
  </div>
}

interface SearchResultsProps {
  activeTab: ChatSearchTab
  directConversations: DirectConversationSummary[]
  availableDirectConversations: DirectConversationSummary[]
  groups: ChatGroupSummary[]
  accountResults: FriendSearchResult[]
  messageResults: ChatMessageSearchResult[]
  currentGroupId?: string
  currentDirectConversationId?: string
  isSearching: boolean
  hasResults: boolean
  queryError: string | null
  noResultMessage: string
  busyUserId: string | null
  onSendFriendRequest: (user: FriendSearchResult) => Promise<void>
}

function SearchResults(props: SearchResultsProps) {
  if (props.queryError) return null
  if (props.isSearching && !props.hasResults) return <div className="space-y-2 pt-2">{[0, 1, 2].map((item) => <div className="h-16 animate-pulse rounded-2xl bg-palette-100/80 dark:bg-white/5" key={item} />)}</div>
  if (!props.hasResults) return <EmptySearchState message={props.noResultMessage} />
  const showContacts = props.activeTab === 'all' || props.activeTab === 'contacts'
  const showMessages = props.activeTab === 'all' || props.activeTab === 'messages'

  return <>
    {showContacts && props.directConversations.length > 0 && <ResultSection title="Liên hệ">
      {props.directConversations.map((conversation) => <DirectConversationCard active={conversation.id === props.currentDirectConversationId} conversation={conversation} key={conversation.id} />)}
    </ResultSection>}
    {props.activeTab === 'all' && props.groups.length > 0 && <ResultSection title="Nhóm">
      {props.groups.map((group) => <ChatGroupCard active={group.id === props.currentGroupId} group={group} key={group.id} />)}
    </ResultSection>}
    {showContacts && props.accountResults.length > 0 && <ResultSection title="Tài khoản">
      {props.accountResults.map((user) => <AccountSearchCard busy={props.busyUserId === user.id} conversationId={props.availableDirectConversations.find((conversation) => conversation.participant.id === user.id)?.id} key={user.id} onSendFriendRequest={props.onSendFriendRequest} user={user} />)}
    </ResultSection>}
    {showMessages && props.messageResults.length > 0 && <ResultSection title="Tin nhắn">
      {props.messageResults.map((message) => <MessageSearchCard key={`${message.conversationType}-${message.messageId}`} message={message} />)}
    </ResultSection>}
  </>
}

function ResultSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="space-y-1 pt-2"><h2 className="px-3 py-1 text-[11px] font-extrabold tracking-wide text-slate-500 uppercase dark:text-slate-400">{title}</h2>{children}</section>
}

function AccountSearchCard({ user, busy, conversationId, onSendFriendRequest }: { user: FriendSearchResult; busy: boolean; conversationId?: string; onSendFriendRequest: (user: FriendSearchResult) => Promise<void> }) {
  const avatarUrl = formatAvatarUrl(user.avatarUrl)
  const relationLabel = user.relation === 'incoming'
    ? 'Đã gửi lời mời cho bạn'
    : user.relation === 'outgoing'
      ? 'Đã gửi yêu cầu kết bạn'
      : user.relation === 'friend' ? 'Đã là bạn bè' : null
  return <article className="flex min-h-16 items-center gap-2 rounded-2xl px-3 py-2 transition hover:bg-palette-100/65 dark:hover:bg-white/8">
    {avatarUrl ? <img alt="" className="size-10 shrink-0 rounded-full object-cover" src={avatarUrl} /> : <span className="grid size-10 shrink-0 place-items-center rounded-full bg-palette-200 text-xs font-black text-palette-900 dark:bg-white/12 dark:text-white">{user.fullName.charAt(0).toUpperCase()}</span>}
    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-extrabold text-palette-900 dark:text-white">{user.fullName}</span><span className="block truncate text-xs text-slate-500 dark:text-slate-300">@{user.username}</span></span>
    {user.relation === 'friend' && conversationId
      ? <Link className="inline-flex min-h-11 shrink-0 items-center rounded-xl border border-palette-200/80 bg-palette-100/75 px-3 text-xs font-extrabold text-palette-900 transition hover:bg-palette-200/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-palette-700 dark:border-white/15 dark:bg-white/10 dark:text-palette-100 dark:hover:bg-white/15" to={`/chat/conversations/${conversationId}`}>Nhắn tin</Link>
      : user.relation === 'none' && user.exactMatch
      ? <button className="min-h-11 shrink-0 rounded-xl bg-gradient-to-r from-palette-900 to-palette-700 px-3 text-xs font-extrabold text-white disabled:opacity-50" disabled={busy} onClick={() => void onSendFriendRequest(user)} type="button">Kết bạn</button>
      : relationLabel && <span className="max-w-20 text-right text-[10px] font-semibold leading-4 text-slate-500 dark:text-slate-300">{relationLabel}</span>}
  </article>
}

function MessageSearchCard({ message }: { message: ChatMessageSearchResult }) {
  const path = message.conversationType === 'direct'
    ? `/chat/conversations/${message.conversationId}`
    : `/chat/groups/${message.conversationId}`
  return <Link className="block rounded-2xl px-3 py-2.5 transition hover:bg-palette-100/65 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-palette-700 dark:hover:bg-white/8" to={`${path}?message=${encodeURIComponent(message.messageId)}`}>
    <span className="flex items-center gap-2"><ChatActionIcon className="size-4 shrink-0 text-palette-700 dark:text-palette-200" name="message" /><span className="truncate text-xs font-extrabold text-palette-900 dark:text-white">{message.conversationName}</span></span>
    <span className="mt-1 line-clamp-2 block text-xs leading-5 text-slate-600 dark:text-slate-300"><strong>{message.sender.fullName}:</strong> {message.content}</span>
  </Link>
}

function EmptySearchState({ message }: { message: string }) {
  const [title, detail] = message.includes('. ')
    ? message.split(/\. (.+)/).filter(Boolean)
    : [message, '']
  return <div className="flex min-h-64 flex-col items-center justify-center px-5 py-8 text-center">
    <span className="grid size-20 place-items-center text-palette-700 dark:text-palette-200"><ChatActionIcon className="size-16" name="search" /></span>
    <p className="mt-7 text-sm font-normal leading-5 text-palette-900 dark:text-white">{title}</p>
    {detail && <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-300">{detail}</p>}
  </div>
}

function DirectConversationCard({ conversation, active }: { conversation: DirectConversationSummary; active: boolean }) {
  const { language } = useTranslation()
  const lastMessage = conversation.lastMessage
  const preview = lastMessage
    ? `${lastMessage.isOwn ? (language === 'VI' ? 'Bạn: ' : 'You: ') : ''}${lastMessage.content}`
    : (language === 'VI' ? 'Chưa có tin nhắn' : 'No messages yet')

  return (
    <Link
      aria-current={active ? 'page' : undefined}
      className={`flex min-h-16 min-w-0 items-center gap-3 rounded-2xl px-3 py-2.5 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-palette-700 ${active ? 'bg-gradient-to-r from-palette-200/85 to-palette-100/70 shadow-sm dark:from-palette-700/70 dark:to-palette-950/55' : 'hover:bg-palette-100/65 dark:hover:bg-white/8'}`}
      to={`/chat/conversations/${conversation.id}`}
    >
      <ChatPresenceAvatar user={conversation.participant} />
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm font-extrabold text-palette-900 dark:text-white">{conversation.participant.fullName}</span>
          {lastMessage && <time className="shrink-0 text-[10px] font-semibold text-slate-500 dark:text-slate-300" dateTime={lastMessage.createdAt}>{formatConversationListTime(lastMessage.createdAt, language)}</time>}
        </span>
        <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-300" title={preview}>{preview}</span>
      </span>
    </Link>
  )
}

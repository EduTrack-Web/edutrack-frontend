import { Fragment, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { formatAvatarUrl } from '@/shared/api/httpClient'
import { ChatActionIcon } from '@/modules/chat/components/ChatActionIcon'
import { ChatComposerGuide } from '@/modules/chat/components/ChatComposerGuide'
import type { ChatGroupDetail, ChatGroupMemberItem, ChatMessage } from '@/modules/chat/models/chat.types'
import {
  endsMessageRun,
  formatMessageDate,
  formatMessageTime,
  startsMessageDate,
  startsMessageRun,
} from '@/modules/chat/models/chatMessageDisplay'
import { CHAT_MESSAGE_TEXT_MAX_LENGTH } from '@/modules/chat/models/chatMessageValidation'
import { useLanguage } from '@/modules/i18n/viewmodels/useLanguage'
import { useChatGroupViewModel } from '@/modules/chat/viewmodels/useChatGroupViewModel'

const roleLabel = { owner: 'Trưởng nhóm', manager: 'Phó nhóm', member: 'Thành viên' } as const

export function ChatGroupPage() {
  const vm = useChatGroupViewModel()
  const [isInformationOpen, setIsInformationOpen] = useState(false)

  useEffect(() => {
    if (!isInformationOpen) return undefined
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsInformationOpen(false)
    }
    const desktopQuery = window.matchMedia('(min-width: 1280px)')
    const closeAtDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setIsInformationOpen(false)
    }
    document.addEventListener('keydown', closeOnEscape)
    desktopQuery.addEventListener('change', closeAtDesktop)
    return () => {
      document.removeEventListener('keydown', closeOnEscape)
      desktopQuery.removeEventListener('change', closeAtDesktop)
    }
  }, [isInformationOpen])

  if (vm.isLoading) return <div className="content-card mx-auto h-[calc(100dvh-9rem)] max-w-[96rem] animate-pulse" aria-label="Đang tải nhóm" />
  if (vm.loadError || !vm.group) return (
    <section className="content-card mx-auto max-w-xl p-6 text-center">
      <h1 className="text-xl font-black text-palette-900 dark:text-white">Không thể mở nhóm</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{vm.loadError}</p>
      <div className="mt-5 flex justify-center gap-3"><button className="secondary-button" onClick={vm.goBack} type="button">Về danh sách</button><button className="primary-button" onClick={() => void vm.retry()} type="button">Thử lại</button></div>
    </section>
  )

  const group = vm.group
  return (
    <div className="grid h-full min-h-0 min-w-0 xl:grid-cols-[minmax(20rem,1fr)_18rem] 2xl:grid-cols-[minmax(28rem,1fr)_20rem]">
      <section className="flex min-h-[calc(100dvh-9rem)] min-w-0 flex-col bg-white/30 lg:min-h-0 dark:bg-palette-950/10" aria-label={`Trò chuyện trong nhóm ${group.name}`}>
        <header className="relative flex min-h-18 items-center gap-3 border-b border-palette-200/70 px-3 py-3 sm:px-4 dark:border-white/10">
          <button aria-label="Trở lại danh sách nhóm" className="grid size-11 shrink-0 place-items-center rounded-full text-palette-900 transition hover:bg-palette-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-palette-700 lg:hidden dark:text-white dark:hover:bg-white/10" onClick={vm.goBack} type="button"><ChatActionIcon name="back" /></button>
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-palette-200 via-palette-500 to-palette-700 text-palette-950 shadow-sm dark:from-palette-500 dark:via-palette-700 dark:to-palette-950 dark:text-white"><ChatActionIcon name="group" /></span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-black text-palette-900 sm:text-lg dark:text-white">{group.name}</h1>
            <p className="truncate text-xs text-slate-500 dark:text-slate-300">{group.memberCount} thành viên · {roleLabel[group.role]}</p>
          </div>
          <button aria-expanded={isInformationOpen} aria-label="Mở thông tin nhóm" className="grid size-11 shrink-0 place-items-center rounded-full text-palette-700 transition hover:bg-palette-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-palette-700 xl:hidden dark:text-palette-200 dark:hover:bg-white/10" onClick={() => setIsInformationOpen(true)} type="button"><ChatActionIcon name="info" /></button>
        </header>

        <ChatMessagesPanel
          characterCount={vm.messageCharacterCount}
          currentUserId={vm.currentUserId}
          draft={vm.messageDraft}
          error={vm.messageError}
          hasOlderMessages={vm.hasOlderMessages}
          highlightedMessageId={vm.highlightedMessageId}
          isLoadingOlder={vm.isLoadingOlderMessages}
          isSending={vm.isSendingMessage}
          messages={vm.messages}
          onDraftChange={vm.setMessageDraft}
          onLoadOlder={vm.loadOlderMessages}
          onGoToLatest={vm.goToLatestMessages}
          onSend={vm.sendMessage}
        />
      </section>

      <aside className="hidden min-h-0 border-l border-palette-200/70 bg-white/35 xl:flex xl:flex-col dark:border-white/10 dark:bg-palette-950/20" aria-label="Thông tin nhóm">
        <InformationPanelHeader />
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <GroupInformationPanel
            group={group}
            invite={vm.invite}
            isCreatingInvite={vm.isCreatingInvite}
            onCopyInvite={vm.copyInvite}
            onCreateInvite={vm.createInviteLink}
          />
        </div>
      </aside>

      {isInformationOpen && createPortal(
        <div className="fixed inset-0 z-[90] bg-palette-950/30 backdrop-blur-[2px] xl:hidden" onMouseDown={() => setIsInformationOpen(false)} role="presentation">
          <aside aria-label="Thông tin nhóm" aria-modal="true" className="absolute top-2 right-2 bottom-2 flex w-[min(22rem,calc(100vw-1rem))] min-h-0 flex-col overflow-hidden rounded-2xl border border-palette-200/80 bg-white/96 shadow-2xl backdrop-blur-xl dark:border-white/15 dark:bg-palette-950/96" onMouseDown={(event) => event.stopPropagation()} role="dialog">
            <InformationPanelHeader onClose={() => setIsInformationOpen(false)} />
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <GroupInformationPanel
                group={group}
                invite={vm.invite}
                isCreatingInvite={vm.isCreatingInvite}
                onCopyInvite={vm.copyInvite}
                onCreateInvite={vm.createInviteLink}
              />
            </div>
          </aside>
        </div>,
        document.body,
      )}
    </div>
  )
}

function InformationPanelHeader({ onClose }: { onClose?: () => void }) {
  return (
    <header className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-palette-200/70 px-4 dark:border-white/10">
      <h2 className="text-sm font-black text-palette-900 dark:text-white">Thông tin nhóm</h2>
      {onClose && <button aria-label="Đóng thông tin nhóm" className="grid size-11 place-items-center rounded-full text-palette-900 transition hover:bg-palette-100 focus-visible:outline-2 focus-visible:outline-palette-700 dark:text-white dark:hover:bg-white/10" onClick={onClose} type="button"><ChatActionIcon name="close" /></button>}
    </header>
  )
}

interface ChatMessagesPanelProps {
  messages: ChatMessage[]
  currentUserId: string
  draft: string
  error: string | null
  characterCount: number
  hasOlderMessages: boolean
  highlightedMessageId: string
  isLoadingOlder: boolean
  isSending: boolean
  onDraftChange: (value: string) => void
  onLoadOlder: () => Promise<void>
  onGoToLatest: () => void
  onSend: () => Promise<void>
}

function ChatMessagesPanel({
  messages,
  currentUserId,
  draft,
  error,
  characterCount,
  hasOlderMessages,
  highlightedMessageId,
  isLoadingOlder,
  isSending,
  onDraftChange,
  onLoadOlder,
  onGoToLatest,
  onSend,
}: ChatMessagesPanelProps) {
  const { language } = useLanguage()
  const listRef = useRef<HTMLDivElement>(null)
  const previousLastMessageId = useRef<string | undefined>(undefined)
  const lastMessageId = messages.at(-1)?.id

  useEffect(() => {
    if (!lastMessageId || previousLastMessageId.current === lastMessageId) return
    previousLastMessageId.current = lastMessageId
    const frame = window.requestAnimationFrame(() => {
      const list = listRef.current
      if (list) list.scrollTop = list.scrollHeight
    })
    return () => window.cancelAnimationFrame(frame)
  }, [lastMessageId])

  useEffect(() => {
    if (!highlightedMessageId) return
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(`chat-message-${highlightedMessageId}`)?.scrollIntoView({
        block: 'center',
        behavior: 'smooth',
      })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [highlightedMessageId, messages])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-palette-100/20 via-transparent to-palette-100/15 p-3 sm:p-4 dark:from-palette-950/15 dark:to-palette-900/15" ref={listRef}>
        {hasOlderMessages && (
          <div className="flex justify-center">
            <button className="min-h-11 rounded-full border border-palette-200/80 bg-white/80 px-4 text-xs font-bold text-palette-900 shadow-sm transition hover:bg-white disabled:opacity-50 dark:border-white/15 dark:bg-white/10 dark:text-palette-100" disabled={isLoadingOlder} onClick={() => void onLoadOlder()} type="button">
              {isLoadingOlder ? 'Đang tải…' : 'Xem tin nhắn trước đó'}
            </button>
          </div>
        )}
        {highlightedMessageId && <div className="flex justify-center"><button className="min-h-11 rounded-full border border-palette-200/80 bg-white/80 px-4 text-xs font-bold text-palette-900 shadow-sm dark:border-white/15 dark:bg-white/10 dark:text-palette-100" onClick={onGoToLatest} type="button">Về tin nhắn mới nhất</button></div>}
        {messages.length === 0 ? (
          <div className="grid h-full min-h-64 place-items-center text-center">
            <div>
              <span className="mx-auto grid size-14 place-items-center rounded-full bg-gradient-to-br from-palette-100 to-palette-200 text-palette-700 shadow-sm dark:from-white/8 dark:to-white/12 dark:text-palette-200"><ChatActionIcon name="message" /></span>
              <p className="mt-3 text-sm font-bold text-palette-900 dark:text-white">Bắt đầu cuộc trò chuyện</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">Gửi tin nhắn đầu tiên cho nhóm.</p>
            </div>
          </div>
        ) : messages.map((message, index) => <Fragment key={message.id}>
          {startsMessageDate(messages, index) && <div className="flex justify-center py-2"><time className="rounded-full bg-slate-500/18 px-3 py-1 text-[11px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300" dateTime={message.createdAt}>{formatMessageDate(message.createdAt, language)}</time></div>}
          <MessageBubble
            language={language}
            isOwnMessage={message.sender.id === currentUserId}
            message={message}
            highlighted={message.id === highlightedMessageId}
            showSender={startsMessageRun(messages, index)}
            showTime={endsMessageRun(messages, index)}
          />
        </Fragment>)}
      </div>

      <form className="relative border-t border-palette-200/70 bg-white/55 p-3 dark:border-white/10 dark:bg-palette-950/25" noValidate onSubmit={(event) => { event.preventDefault(); void onSend() }}>
        <ChatComposerGuide userId={currentUserId} />
        <div className={`flex items-end gap-2 rounded-2xl border bg-white/82 p-1.5 shadow-inner transition dark:bg-white/7 ${error ? 'border-red-500' : 'border-palette-200/80 focus-within:border-palette-700 focus-within:ring-3 focus-within:ring-palette-200/35 dark:border-white/15 dark:focus-within:border-palette-500'}`}>
          <label className="sr-only" htmlFor="chat-message-content">Nội dung tin nhắn</label>
          <textarea
            aria-describedby={error ? 'chat-message-error' : undefined}
            aria-invalid={Boolean(error)}
            className="max-h-32 min-h-11 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent px-3 py-2.5 text-sm leading-6 text-palette-900 outline-none placeholder:text-slate-500 dark:text-white dark:placeholder:text-slate-400"
            id="chat-message-content"
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault()
                void onSend()
              }
            }}
            placeholder="Nhập tin nhắn…"
            rows={1}
            value={draft}
          />
          <button aria-label="Gửi tin nhắn" className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-palette-700 to-palette-500 text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50" disabled={isSending} type="submit"><ChatActionIcon name="send" /></button>
        </div>
        {(draft.length > 0 || error) && <div className="mt-1.5 flex items-start justify-between gap-3 px-1 text-[11px]">
          <div className="min-w-0 flex-1">{error && <p className="font-semibold text-red-600 dark:text-red-300" id="chat-message-error">{error}</p>}</div>
          <p className={characterCount > CHAT_MESSAGE_TEXT_MAX_LENGTH ? 'font-semibold text-red-600 dark:text-red-300' : 'text-slate-500 dark:text-slate-400'}>{characterCount.toLocaleString('vi-VN')}/{CHAT_MESSAGE_TEXT_MAX_LENGTH.toLocaleString('vi-VN')}</p>
        </div>}
      </form>
    </div>
  )
}

function MessageBubble({ message, isOwnMessage, showSender, showTime, highlighted, language }: { message: ChatMessage; isOwnMessage: boolean; showSender: boolean; showTime: boolean; highlighted: boolean; language: 'VI' | 'EN' }) {
  const avatarUrl = formatAvatarUrl(message.sender.avatarUrl)
  return (
    <article className={`flex scroll-m-20 items-end gap-2 rounded-2xl transition ${isOwnMessage ? 'justify-end' : 'justify-start'} ${highlighted ? 'ring-2 ring-palette-500 ring-offset-4 ring-offset-transparent' : ''}`} id={`chat-message-${message.id}`}>
      {!isOwnMessage && (showSender
        ? (avatarUrl
          ? <img alt="" className="size-9 shrink-0 rounded-full object-cover" src={avatarUrl} />
          : <span className="grid size-9 shrink-0 place-items-center rounded-full bg-palette-200 text-xs font-black text-palette-900 dark:bg-white/12 dark:text-white">{message.sender.fullName.charAt(0).toUpperCase()}</span>)
        : <span aria-hidden="true" className="size-9 shrink-0" />)}
      <div className={`max-w-[82%] rounded-2xl px-3 py-2 sm:max-w-[72%] ${isOwnMessage ? 'rounded-br-md bg-gradient-to-br from-palette-900 to-palette-700 text-white shadow-sm' : 'rounded-bl-md border border-palette-200/50 bg-white/92 text-palette-900 shadow-sm dark:border-white/8 dark:bg-white/10 dark:text-white'}`}>
        {!isOwnMessage && showSender && <p className="mb-1 text-xs font-extrabold text-palette-700 dark:text-palette-200">{message.sender.fullName}</p>}
        <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.content}</p>
        {showTime && <time className={`mt-0.5 block text-right text-[10px] ${isOwnMessage ? 'text-white/75' : 'text-slate-500 dark:text-slate-300'}`} dateTime={message.createdAt}>{formatMessageTime(message.createdAt, language)}</time>}
      </div>
    </article>
  )
}

interface GroupInformationPanelProps {
  group: ChatGroupDetail
  invite: { url: string; expiresAt: string } | null
  isCreatingInvite: boolean
  onCreateInvite: () => Promise<void>
  onCopyInvite: () => Promise<void>
}

function GroupInformationPanel({ group, invite, isCreatingInvite, onCreateInvite, onCopyInvite }: GroupInformationPanelProps) {
  return (
    <div className="space-y-5">
      <div className="text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-gradient-to-br from-palette-200 via-palette-500 to-palette-700 text-palette-950 shadow-md dark:from-palette-500 dark:via-palette-700 dark:to-palette-950 dark:text-white"><ChatActionIcon className="size-7" name="group" /></span>
        <h2 className="mt-3 break-words text-base font-black text-palette-900 dark:text-white">{group.name}</h2>
        {group.description && <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-slate-500 dark:text-slate-300">{group.description}</p>}
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <InfoTile label="Thành viên" value={String(group.memberCount)} />
        <InfoTile label="Đang chờ" value={String(group.pendingInvitationCount)} />
        <InfoTile label="Lịch sử" value={group.historyVisibility === 'all' ? 'Tất cả' : 'Từ lúc vào'} />
      </div>

      {group.canManageInvites && (
        <section className="border-t border-palette-200/70 pt-4 dark:border-white/10">
          <div className="flex items-center gap-2"><ChatActionIcon className="size-4 text-palette-700 dark:text-palette-200" name="link" /><h3 className="text-sm font-extrabold text-palette-900 dark:text-white">Liên kết tham gia</h3></div>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-300">Liên kết có hiệu lực 7 ngày. Tạo mới sẽ thu hồi liên kết cũ.</p>
          <button className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-palette-900 to-palette-700 px-3 text-xs font-extrabold text-white shadow-sm disabled:opacity-50" disabled={isCreatingInvite} onClick={() => void onCreateInvite()} type="button"><ChatActionIcon className="size-4" name="plus" />{isCreatingInvite ? 'Đang tạo…' : invite ? 'Tạo liên kết mới' : 'Tạo liên kết'}</button>
          {invite && <div className="mt-2 rounded-xl bg-palette-100/70 p-2.5 dark:bg-white/6"><p className="line-clamp-2 break-all text-xs font-semibold text-palette-900 dark:text-white">{invite.url}</p><button className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-palette-200/80 bg-white/70 px-3 text-xs font-bold text-palette-900 dark:border-white/15 dark:bg-white/8 dark:text-palette-100" onClick={() => void onCopyInvite()} type="button"><ChatActionIcon className="size-4" name="copy" />Sao chép</button><p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">Hết hạn {new Date(invite.expiresAt).toLocaleString('vi-VN')}</p></div>}
        </section>
      )}

      <section className="border-t border-palette-200/70 pt-4 dark:border-white/10">
        <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-extrabold text-palette-900 dark:text-white">Thành viên</h3><span className="text-xs font-bold text-slate-500 dark:text-slate-300">{group.members.length}</span></div>
        <div className="mt-2 space-y-1">{group.members.map((member) => <MemberCard key={member.user.id} member={member} />)}</div>
      </section>

      {group.canManageInvites && group.invitations.length > 0 && (
        <section className="border-t border-palette-200/70 pt-4 dark:border-white/10">
          <h3 className="text-sm font-extrabold text-palette-900 dark:text-white">Đang được mời</h3>
          <div className="mt-2 space-y-1">{group.invitations.map((invitation) => <MemberCard key={invitation.id} member={{ role: 'member', joinedAt: invitation.createdAt, user: invitation.user }} pending />)}</div>
        </section>
      )}
    </div>
  )
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-xl bg-palette-100/70 p-2 dark:bg-white/5"><p className="truncate text-sm font-extrabold text-palette-900 dark:text-white">{value}</p><p className="mt-0.5 truncate text-[10px] text-slate-500 dark:text-slate-300">{label}</p></div>
}

function MemberCard({ member, pending = false }: { member: ChatGroupMemberItem; pending?: boolean }) {
  const avatarUrl = formatAvatarUrl(member.user.avatarUrl)
  return <article className="flex min-w-0 items-center gap-2 rounded-xl p-2 transition hover:bg-palette-100/60 dark:hover:bg-white/6">
    {avatarUrl ? <img alt="" className="size-9 shrink-0 rounded-full object-cover" src={avatarUrl} /> : <span className="grid size-9 shrink-0 place-items-center rounded-full bg-palette-200 text-xs font-black text-palette-900 dark:bg-white/12 dark:text-white">{member.user.fullName.charAt(0).toUpperCase()}</span>}
    <div className="min-w-0 flex-1"><p className="truncate text-xs font-extrabold text-palette-900 dark:text-white">{member.user.fullName}</p><p className="truncate text-[11px] text-slate-500 dark:text-slate-300">{pending ? 'Chờ tham gia' : roleLabel[member.role]}</p></div>
  </article>
}

import { Fragment, useEffect, useRef } from 'react'

import { ChatActionIcon } from '@/modules/chat/components/ChatActionIcon'
import { ChatComposerGuide } from '@/modules/chat/components/ChatComposerGuide'
import { ChatPresenceAvatar, ChatPresenceLabel } from '@/modules/chat/components/ChatPresence'
import type { DirectChatMessage, DirectConversationSummary } from '@/modules/chat/models/chat.types'
import {
  endsMessageRun,
  formatMessageDate,
  formatMessageTime,
  startsMessageDate,
  startsMessageRun,
} from '@/modules/chat/models/chatMessageDisplay'
import { CHAT_MESSAGE_TEXT_MAX_LENGTH } from '@/modules/chat/models/chatMessageValidation'
import { useDirectConversationViewModel } from '@/modules/chat/viewmodels/useDirectConversationViewModel'
import { useLanguage } from '@/modules/i18n/viewmodels/useLanguage'
import { formatAvatarUrl } from '@/shared/api/httpClient'

export function DirectChatPage() {
  const vm = useDirectConversationViewModel()
  if (vm.isLoading) return <div className="content-card mx-auto h-[calc(100dvh-9rem)] max-w-[96rem] animate-pulse" aria-label="Đang tải cuộc trò chuyện" />
  if (vm.loadError || !vm.conversation) return (
    <section className="content-card mx-auto max-w-xl p-6 text-center">
      <h1 className="text-xl font-black text-palette-900 dark:text-white">Không thể mở cuộc trò chuyện</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{vm.loadError}</p>
      <div className="mt-5 flex justify-center gap-3"><button className="secondary-button" onClick={vm.goBack} type="button">Về danh sách</button><button className="primary-button" onClick={() => void vm.retry()} type="button">Thử lại</button></div>
    </section>
  )

  const conversation = vm.conversation
  return (
    <div className="grid h-full min-h-0 min-w-0 2xl:grid-cols-[minmax(28rem,1fr)_19rem]">
      <section className="flex min-h-[calc(100dvh-9rem)] min-w-0 flex-col bg-white/30 lg:min-h-0 dark:bg-palette-950/10" aria-label={`Trò chuyện với ${conversation.participant.fullName}`}>
        <header className="flex min-h-18 items-center gap-3 border-b border-palette-200/70 px-3 py-3 sm:px-4 dark:border-white/10">
          <button aria-label="Trở lại danh sách đoạn chat" className="grid size-11 shrink-0 place-items-center rounded-full text-palette-900 transition hover:bg-palette-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-palette-700 lg:hidden dark:text-white dark:hover:bg-white/10" onClick={vm.goBack} type="button"><ChatActionIcon name="back" /></button>
          <ChatPresenceAvatar user={conversation.participant} />
          <div className="min-w-0 flex-1"><h1 className="truncate text-base font-black text-palette-900 sm:text-lg dark:text-white">{conversation.participant.fullName}</h1><ChatPresenceLabel className="block truncate text-xs text-slate-500 dark:text-slate-300" user={conversation.participant} /></div>
          <details className="group relative 2xl:hidden">
            <summary aria-label="Mở thông tin trò chuyện" className="grid size-11 cursor-pointer list-none place-items-center rounded-full text-palette-700 transition hover:bg-palette-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-palette-700 [&::-webkit-details-marker]:hidden dark:text-palette-200 dark:hover:bg-white/10"><ChatActionIcon name="info" /></summary>
            <div className="absolute top-13 right-0 z-30 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-palette-200/80 bg-white/96 p-4 shadow-2xl backdrop-blur-xl dark:border-white/15 dark:bg-palette-950/96"><ConversationInformation conversation={conversation} /></div>
          </details>
        </header>

        <DirectMessagesPanel
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

      <aside className="hidden min-h-0 overflow-y-auto border-l border-palette-200/70 bg-white/35 p-4 2xl:block dark:border-white/10 dark:bg-palette-950/20" aria-label="Thông tin trò chuyện">
        <ConversationInformation conversation={conversation} />
      </aside>
    </div>
  )
}

interface DirectMessagesPanelProps {
  messages: DirectChatMessage[]
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

function DirectMessagesPanel({ messages, currentUserId, draft, error, characterCount, hasOlderMessages, highlightedMessageId, isLoadingOlder, isSending, onDraftChange, onLoadOlder, onGoToLatest, onSend }: DirectMessagesPanelProps) {
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

  return <div className="flex min-h-0 flex-1 flex-col">
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-palette-100/20 via-transparent to-palette-100/15 p-3 sm:p-4 dark:from-palette-950/15 dark:to-palette-900/15" ref={listRef}>
      {hasOlderMessages && <div className="flex justify-center"><button className="min-h-11 rounded-full border border-palette-200/80 bg-white/80 px-4 text-xs font-bold text-palette-900 shadow-sm disabled:opacity-50 dark:border-white/15 dark:bg-white/10 dark:text-palette-100" disabled={isLoadingOlder} onClick={() => void onLoadOlder()} type="button">{isLoadingOlder ? 'Đang tải…' : 'Xem tin nhắn trước đó'}</button></div>}
      {highlightedMessageId && <div className="flex justify-center"><button className="min-h-11 rounded-full border border-palette-200/80 bg-white/80 px-4 text-xs font-bold text-palette-900 shadow-sm dark:border-white/15 dark:bg-white/10 dark:text-palette-100" onClick={onGoToLatest} type="button">Về tin nhắn mới nhất</button></div>}
      {messages.length === 0 ? <div className="grid h-full min-h-64 place-items-center text-center"><div><span className="mx-auto grid size-14 place-items-center rounded-full bg-palette-100 text-palette-700 dark:bg-white/10 dark:text-palette-200"><ChatActionIcon name="message" /></span><p className="mt-3 text-sm font-bold text-palette-900 dark:text-white">Bắt đầu cuộc trò chuyện</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-300">Gửi tin nhắn đầu tiên cho bạn bè.</p></div></div> : messages.map((message, index) => <Fragment key={message.id}>
        {startsMessageDate(messages, index) && <div className="flex justify-center py-2"><time className="rounded-full bg-slate-500/18 px-3 py-1 text-[11px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300" dateTime={message.createdAt}>{formatMessageDate(message.createdAt, language)}</time></div>}
        <DirectMessageBubble
          language={language}
          isOwnMessage={message.sender.id === currentUserId}
          message={message}
          highlighted={message.id === highlightedMessageId}
          showAvatar={startsMessageRun(messages, index)}
          showTime={endsMessageRun(messages, index)}
        />
      </Fragment>)}
    </div>
    <form className="relative border-t border-palette-200/70 bg-white/55 p-3 dark:border-white/10 dark:bg-palette-950/25" noValidate onSubmit={(event) => { event.preventDefault(); void onSend() }}>
      <ChatComposerGuide userId={currentUserId} />
      <div className={`flex items-end gap-2 rounded-2xl border bg-white/82 p-1.5 shadow-inner transition dark:bg-white/7 ${error ? 'border-red-500' : 'border-palette-200/80 focus-within:border-palette-700 focus-within:ring-3 focus-within:ring-palette-200/35 dark:border-white/15 dark:focus-within:border-palette-500'}`}>
        <label className="sr-only" htmlFor="direct-chat-message-content">Nội dung tin nhắn</label>
        <textarea aria-describedby={error ? 'direct-chat-message-error' : undefined} aria-invalid={Boolean(error)} className="max-h-32 min-h-11 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent px-3 py-2.5 text-sm leading-6 text-palette-900 outline-none placeholder:text-slate-500 dark:text-white dark:placeholder:text-slate-400" id="direct-chat-message-content" onChange={(event) => onDraftChange(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void onSend() } }} placeholder="Nhập tin nhắn…" rows={1} value={draft} />
        <button aria-label="Gửi tin nhắn" className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-palette-900 to-palette-700 text-white shadow-sm disabled:opacity-50" disabled={isSending} type="submit"><ChatActionIcon name="send" /></button>
      </div>
      {(draft.length > 0 || error) && <div className="mt-1.5 flex items-start justify-between gap-3 px-1 text-[11px]"><div className="min-w-0 flex-1">{error && <p className="font-semibold text-red-600 dark:text-red-300" id="direct-chat-message-error">{error}</p>}</div><p className={characterCount > CHAT_MESSAGE_TEXT_MAX_LENGTH ? 'font-semibold text-red-600 dark:text-red-300' : 'text-slate-500 dark:text-slate-400'}>{characterCount.toLocaleString('vi-VN')}/{CHAT_MESSAGE_TEXT_MAX_LENGTH.toLocaleString('vi-VN')}</p></div>}
    </form>
  </div>
}

function DirectMessageBubble({ message, isOwnMessage, showAvatar, showTime, highlighted, language }: { message: DirectChatMessage; isOwnMessage: boolean; showAvatar: boolean; showTime: boolean; highlighted: boolean; language: 'VI' | 'EN' }) {
  const avatarUrl = formatAvatarUrl(message.sender.avatarUrl)
  return <article className={`flex scroll-m-20 items-end gap-2 rounded-2xl transition ${isOwnMessage ? 'justify-end' : 'justify-start'} ${highlighted ? 'ring-2 ring-palette-500 ring-offset-4 ring-offset-transparent' : ''}`} id={`chat-message-${message.id}`}>
    {!isOwnMessage && (showAvatar
      ? (avatarUrl ? <img alt="" className="size-9 shrink-0 rounded-full object-cover" src={avatarUrl} /> : <span className="grid size-9 shrink-0 place-items-center rounded-full bg-palette-200 text-xs font-black text-palette-950 dark:bg-white/12 dark:text-white">{message.sender.fullName.charAt(0).toUpperCase()}</span>)
      : <span aria-hidden="true" className="size-9 shrink-0" />)}
    <div className={`max-w-[82%] rounded-2xl px-3 py-2 sm:max-w-[72%] ${isOwnMessage ? 'rounded-br-md bg-gradient-to-br from-palette-900 to-palette-700 text-white shadow-sm' : 'rounded-bl-md border border-palette-200/50 bg-white/92 text-palette-900 shadow-sm dark:border-white/8 dark:bg-white/10 dark:text-white'}`}><p className="whitespace-pre-wrap break-words text-sm leading-6">{message.content}</p>{showTime && <time className={`mt-0.5 block text-right text-[10px] ${isOwnMessage ? 'text-white/75' : 'text-slate-500 dark:text-slate-300'}`} dateTime={message.createdAt}>{formatMessageTime(message.createdAt, language)}</time>}</div>
  </article>
}

function ConversationInformation({ conversation }: { conversation: DirectConversationSummary }) {
  return <div className="text-center"><span className="inline-flex"><ChatPresenceAvatar size="large" user={conversation.participant} /></span><h2 className="mt-3 break-words text-lg font-black text-palette-900 dark:text-white">{conversation.participant.fullName}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-300">@{conversation.participant.username}</p><ChatPresenceLabel className="mt-1 block text-xs font-semibold text-palette-700 dark:text-palette-200" user={conversation.participant} /><div className="mt-5 border-t border-palette-200/70 pt-4 text-left dark:border-white/10"><h3 className="text-sm font-extrabold text-palette-900 dark:text-white">Thông tin trò chuyện</h3><p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-300">Đoạn chat được tạo tự động khi hai tài khoản trở thành bạn bè.</p></div></div>
}

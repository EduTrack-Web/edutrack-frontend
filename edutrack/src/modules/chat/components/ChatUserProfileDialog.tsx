import { Link } from 'react-router-dom'
import { Ban, MessageCircle, X } from 'lucide-react'

import type { ChatUserSummary } from '@/modules/chat/models/chat.types'
import { formatAvatarUrl } from '@/shared/api/httpClient'

interface ChatUserProfileDialogProps {
  user: ChatUserSummary
  conversationPath?: string
  isBlocking: boolean
  onClose: () => void
  onBlock: () => void
}

export function ChatUserProfileDialog({ user, conversationPath, isBlocking, onClose, onBlock }: ChatUserProfileDialogProps) {
  const avatarUrl = formatAvatarUrl(user.avatarUrl)

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-palette-950/45 p-4 backdrop-blur-sm" onMouseDown={onClose} role="presentation">
      <section aria-labelledby="chat-user-profile-title" aria-modal="true" className="content-card w-full max-w-md overflow-hidden p-0" onMouseDown={(event) => event.stopPropagation()} role="dialog">
        <header className="flex min-h-14 items-center justify-between gap-3 border-b border-palette-200/70 px-4 dark:border-white/10">
          <h2 className="text-base font-black text-palette-900 dark:text-white" id="chat-user-profile-title">Thông tin tài khoản</h2>
          <button aria-label="Đóng thông tin tài khoản" className="grid size-11 place-items-center rounded-full text-palette-700 transition hover:bg-palette-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-palette-700 dark:text-palette-200 dark:hover:bg-white/10" onClick={onClose} type="button"><X aria-hidden="true" className="size-5" /></button>
        </header>

        <div className="p-5 text-center sm:p-6">
          {avatarUrl
            ? <img alt="" className="mx-auto size-20 rounded-full object-cover shadow-md" src={avatarUrl} />
            : <span aria-hidden="true" className="mx-auto grid size-20 place-items-center rounded-full bg-gradient-to-br from-palette-200 to-palette-500 text-2xl font-black text-palette-950 shadow-md dark:from-palette-500 dark:to-palette-800 dark:text-white">{user.fullName.trim().charAt(0).toUpperCase()}</span>}
          <h3 className="mt-3 break-words text-lg font-black text-palette-900 dark:text-white">{user.fullName}</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-300">@{user.username}</p>

          {conversationPath && <Link className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-palette-900 to-palette-700 px-4 text-sm font-extrabold text-white shadow-sm transition hover:brightness-110" onClick={onClose} to={conversationPath}><MessageCircle aria-hidden="true" className="size-4" />Nhắn tin</Link>}
        </div>

        <div className="border-t border-palette-200/70 p-3 dark:border-white/10">
          <button className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold text-red-600 transition hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-950/30" disabled={isBlocking} onClick={onBlock} type="button"><Ban aria-hidden="true" className="size-5 shrink-0" />Chặn tài khoản</button>
        </div>
      </section>
    </div>
  )
}

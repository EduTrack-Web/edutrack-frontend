import { formatAvatarUrl } from '@/shared/api/httpClient'
import type { ChatUserSummary } from '@/modules/chat/models/chat.types'

interface ChatUserCardProps {
  user: ChatUserSummary
  description?: string
  actions?: React.ReactNode
}

export function ChatUserCard({ user, description, actions }: ChatUserCardProps) {
  const avatarUrl = formatAvatarUrl(user.avatarUrl)
  return (
    <article className="flex min-w-0 items-center gap-3 rounded-2xl border border-palette-200/70 bg-white/65 p-3 shadow-xs dark:border-white/10 dark:bg-white/5">
      {avatarUrl
        ? <img alt="" className="size-11 shrink-0 rounded-full object-cover" src={avatarUrl} />
        : <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full bg-palette-200 text-sm font-black text-palette-900 dark:bg-white/15 dark:text-white">{user.fullName.trim().charAt(0).toUpperCase()}</span>}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold text-palette-900 dark:text-white">{user.fullName}</p>
        <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-300">@{user.username}</p>
        {description && <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap justify-end gap-2">{actions}</div>}
    </article>
  )
}

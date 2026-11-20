import { formatAvatarUrl } from '@/shared/api/httpClient'
import type { ChatUserSummary } from '@/modules/chat/models/chat.types'

interface ChatUserCardProps {
  user: ChatUserSummary
  description?: React.ReactNode
  actions?: React.ReactNode
  onViewProfile?: () => void
}

export function ChatUserCard({ user, description, actions, onViewProfile }: ChatUserCardProps) {
  const avatarUrl = formatAvatarUrl(user.avatarUrl)
  const content = <>
    {avatarUrl
      ? <img alt="" className="size-11 shrink-0 rounded-full object-cover" src={avatarUrl} />
      : <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full bg-palette-200 text-sm font-black text-palette-900 dark:bg-white/15 dark:text-white">{user.fullName.trim().charAt(0).toUpperCase()}</span>}
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-extrabold text-palette-900 dark:text-white">{user.fullName}</span>
      <span className="block truncate text-xs font-semibold text-slate-500 dark:text-slate-300">@{user.username}</span>
      {description && <span className="mt-1 block text-xs text-slate-500 dark:text-slate-300">{description}</span>}
    </span>
  </>

  return (
    <article className="flex min-w-0 items-center gap-3 rounded-2xl border border-palette-200/70 bg-white/65 p-3 shadow-xs dark:border-white/10 dark:bg-white/5">
      {onViewProfile
        ? <button aria-label={`Xem thông tin tài khoản ${user.fullName}`} className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-palette-700" onClick={onViewProfile} type="button">{content}</button>
        : <div className="flex min-w-0 flex-1 items-center gap-3">{content}</div>}
      {actions && <div className="flex shrink-0 flex-wrap justify-end gap-2">{actions}</div>}
    </article>
  )
}

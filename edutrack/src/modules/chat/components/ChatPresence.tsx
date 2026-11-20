import { formatAvatarUrl } from '@/shared/api/httpClient'
import type { ChatUserSummary } from '@/modules/chat/models/chat.types'
import { formatChatPresence } from '@/modules/chat/models/chatPresence'
import { useChatPresence } from '@/modules/chat/viewmodels/useChatPresence'
import { useLanguage } from '@/modules/i18n/viewmodels/useLanguage'

interface PresenceUser extends ChatUserSummary {
  isOnline: boolean
  lastActiveAt?: string
}

const avatarSizeClass = {
  small: 'size-11 text-sm',
  medium: 'size-12 text-base',
  large: 'size-20 text-2xl',
} as const

export function ChatPresenceAvatar({ user, size = 'small' }: { user: PresenceUser; size?: keyof typeof avatarSizeClass }) {
  const { presence } = useChatPresence({
    userId: user.id,
    isOnline: user.isOnline,
    ...(user.lastActiveAt ? { lastActiveAt: user.lastActiveAt } : {}),
  })
  const avatarUrl = formatAvatarUrl(user.avatarUrl)
  return <span className="relative shrink-0">
    {avatarUrl
      ? <img alt="" className={`${avatarSizeClass[size]} rounded-full object-cover`} src={avatarUrl} />
      : <span aria-hidden="true" className={`grid ${avatarSizeClass[size]} place-items-center rounded-full bg-palette-200 font-black text-palette-950 dark:bg-white/12 dark:text-white`}>{user.fullName.trim().charAt(0).toUpperCase()}</span>}
    {presence.isOnline && <span aria-hidden="true" className="absolute -right-0.5 -bottom-0.5 size-3.5 rounded-full border-2 border-white bg-emerald-500 shadow-sm dark:border-palette-950" />}
  </span>
}

export function ChatPresenceLabel({ user, className = '' }: { user: PresenceUser; className?: string }) {
  const { presence, now } = useChatPresence({
    userId: user.id,
    isOnline: user.isOnline,
    ...(user.lastActiveAt ? { lastActiveAt: user.lastActiveAt } : {}),
  })
  const { language } = useLanguage()
  return <span className={className}>{formatChatPresence(presence.isOnline, presence.lastActiveAt, language, now)}</span>
}

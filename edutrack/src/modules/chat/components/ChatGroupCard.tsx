import { Link } from 'react-router-dom'

import { ChatActionIcon } from '@/modules/chat/components/ChatActionIcon'
import { formatConversationListTime } from '@/modules/chat/models/conversationListTime'
import type { ChatGroupSummary } from '@/modules/chat/models/chat.types'
import { useTranslation } from '@/modules/i18n/viewmodels/useTranslation'

export function ChatGroupCard({ group, active = false }: { group: ChatGroupSummary; active?: boolean }) {
  const { language } = useTranslation()
  const lastMessage = group.lastMessage
  const senderName = lastMessage?.isOwn
    ? (language === 'VI' ? 'Bạn' : 'You')
    : lastMessage?.sender.fullName
  const preview = lastMessage
    ? `${senderName}: ${lastMessage.content}`
    : `${group.memberCount} ${language === 'VI' ? 'thành viên' : 'members'}`

  return (
    <Link
      aria-current={active ? 'page' : undefined}
      className={`flex min-h-16 min-w-0 items-center gap-3 rounded-2xl px-3 py-2.5 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-palette-700 ${active ? 'bg-gradient-to-r from-palette-200/85 to-palette-100/70 shadow-sm dark:from-palette-700/70 dark:to-palette-950/55' : 'hover:bg-palette-100/65 dark:hover:bg-white/8'}`}
      to={`/chat/groups/${group.id}`}
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-palette-200 via-palette-500 to-palette-700 text-palette-950 shadow-sm dark:from-palette-500 dark:via-palette-700 dark:to-palette-950 dark:text-white"><ChatActionIcon name="group" /></span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm font-extrabold text-palette-900 dark:text-white">{group.name}</span>
          {lastMessage && <time className="shrink-0 text-[10px] font-semibold text-slate-500 dark:text-slate-300" dateTime={lastMessage.createdAt}>{formatConversationListTime(lastMessage.createdAt, language)}</time>}
        </span>
        <span className="mt-0.5 flex min-w-0 items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-xs text-slate-500 dark:text-slate-300" title={preview}>{preview}</span>
          {group.pendingInvitationCount > 0 && <span aria-label={`${group.pendingInvitationCount} lời mời đang chờ`} className="grid min-w-5 shrink-0 place-items-center rounded-full bg-amber-100 px-1 text-[10px] font-black leading-5 text-amber-800 dark:bg-amber-300/15 dark:text-amber-200">{group.pendingInvitationCount}</span>}
        </span>
      </span>
    </Link>
  )
}

import { Link } from 'react-router-dom'

import type { ChatGroupSummary } from '../models/chat.types'
import { ChatActionIcon } from './ChatActionIcon'

const roleLabel = { owner: 'Trưởng nhóm', manager: 'Phó nhóm', member: 'Thành viên' } as const

export function ChatGroupCard({ group }: { group: ChatGroupSummary }) {
  return (
    <Link className="flex min-h-24 min-w-0 items-center gap-3 rounded-2xl border border-palette-200/70 bg-white/65 p-3 shadow-xs hover:-translate-y-0.5 hover:bg-white/90 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10" to={`/chat/groups/${group.id}`}>
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-palette-100 text-palette-700 dark:bg-white/10 dark:text-palette-200"><ChatActionIcon name="group" /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-extrabold text-palette-900 dark:text-white">{group.name}</span>
        <span className="mt-1 block text-xs text-slate-500 dark:text-slate-300">{group.memberCount} thành viên · {roleLabel[group.role]}</span>
        {group.pendingInvitationCount > 0 && <span className="mt-1 block text-xs font-bold text-amber-700 dark:text-amber-300">Đang chờ {group.pendingInvitationCount} người tham gia</span>}
      </span>
    </Link>
  )
}

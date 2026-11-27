import { Link } from 'react-router-dom'
import { Icon } from '@/shared/components/Icon'

interface ChatMessageContentProps {
  content: string
  isOwnMessage?: boolean
}

const SHARED_EVENT_PATH_REGEX = /(?:https?:\/\/[^\s]+)?(\/calendar\/shared\/([A-Za-z0-9_-]+))/

export function ChatMessageContent({ content, isOwnMessage = false }: ChatMessageContentProps) {
  const match = content.match(SHARED_EVENT_PATH_REGEX)
  const sharePath = match?.[1]
  if (!match || !sharePath) {
    return <p className="whitespace-pre-wrap break-words text-sm leading-6">{content}</p>
  }

  const textWithoutLink = content
    .replace(match[0], '')
    .trim()

  return (
    <div className="space-y-2">
      {textWithoutLink && (
        <p className="whitespace-pre-wrap break-words text-sm leading-6">{textWithoutLink}</p>
      )}
      <Link
        className={`flex items-center gap-2.5 rounded-xl border p-2.5 transition ${
          isOwnMessage
            ? 'border-white/25 bg-white/15 text-white hover:bg-white/25'
            : 'border-blue-200 bg-blue-50/70 text-slate-900 hover:bg-blue-100/70 dark:border-blue-800/50 dark:bg-blue-950/40 dark:text-white dark:hover:bg-blue-950/60'
        }`}
        to={sharePath}
      >
        <span
          className={`grid size-8 shrink-0 place-items-center rounded-lg ${
            isOwnMessage ? 'bg-white/20 text-white' : 'bg-blue-600 text-white'
          }`}
        >
          <Icon className="size-4" name="calendar" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold">Sự kiện được chia sẻ</p>
          <p className={`truncate text-[11px] ${isOwnMessage ? 'text-white/80' : 'text-blue-700 dark:text-blue-300'}`}>
            Nhấn để mở sự kiện &amp; xin tham gia →
          </p>
        </div>
      </Link>
    </div>
  )
}

import {
  Activity,
  Ban,
  ContactRound,
  ChevronLeft,
  Copy,
  Ellipsis,
  Info,
  Link,
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  UserRoundPlus,
  Users,
  UsersRound,
  X,
  type LucideIcon,
} from 'lucide-react'

type ChatActionIconName = 'search' | 'friends' | 'contacts' | 'requests' | 'block' | 'send' | 'refresh' | 'group' | 'groupPlus' | 'plus' | 'copy' | 'back' | 'info' | 'link' | 'message' | 'more' | 'settings' | 'activity' | 'close'

interface ChatActionIconProps {
  name: ChatActionIconName
  className?: string
}

const icons: Record<ChatActionIconName, LucideIcon> = {
  search: Search,
  friends: Users,
  contacts: ContactRound,
  requests: UserRoundPlus,
  block: Ban,
  send: Send,
  refresh: RefreshCw,
  group: UsersRound,
  groupPlus: UsersRound,
  plus: Plus,
  copy: Copy,
  back: ChevronLeft,
  info: Info,
  link: Link,
  message: MessageCircle,
  more: Ellipsis,
  settings: Settings,
  activity: Activity,
  close: X,
}

export function ChatActionIcon({ name, className = 'size-5' }: ChatActionIconProps) {
  const Icon = icons[name]

  return <Icon aria-hidden="true" className={className} strokeWidth={1.8} />
}

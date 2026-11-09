type ChatActionIconName = 'search' | 'friends' | 'requests' | 'block' | 'send' | 'refresh'

interface ChatActionIconProps {
  name: ChatActionIconName
  className?: string
}

const paths: Record<ChatActionIconName, React.ReactNode> = {
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  friends: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  requests: <><path d="M15 19a6 6 0 0 0-12 0" /><circle cx="9" cy="8" r="4" /><path d="M19 8v6m3-3h-6" /></>,
  block: <><circle cx="12" cy="12" r="9" /><path d="m5.6 5.6 12.8 12.8" /></>,
  send: <><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>,
  refresh: <><path d="M20 6v5h-5M4 18v-5h5" /><path d="M18.5 9a7 7 0 0 0-12-2L4 11m16 2-2.5 4a7 7 0 0 1-12-2" /></>,
}

export function ChatActionIcon({ name, className = 'size-5' }: ChatActionIconProps) {
  return <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">{paths[name]}</svg>
}

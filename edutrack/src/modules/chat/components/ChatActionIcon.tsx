type ChatActionIconName = 'search' | 'friends' | 'requests' | 'block' | 'send' | 'refresh' | 'group' | 'plus' | 'copy' | 'back'

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
  group: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2" /><circle cx="18" cy="9" r="2.5" /><path d="M16 15.5a5 5 0 0 1 5 5" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  copy: <><rect height="12" rx="2" width="12" x="8" y="8" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>,
  back: <><path d="m15 18-6-6 6-6" /></>,
}

export function ChatActionIcon({ name, className = 'size-5' }: ChatActionIconProps) {
  return <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">{paths[name]}</svg>
}

import type { ReactNode } from 'react'

import type { NavigationIcon } from '../models/navigation'

export type IconName = NavigationIcon | 'menu' | 'close' | 'collapse' | 'expand' | 'globe' | 'sun' | 'moon' | 'login' | 'eye' | 'eyeOff' | 'arrowRight' | 'check' | 'error' | 'warning' | 'info'

interface IconProps { name: IconName; className?: string }

const paths: Record<IconName, ReactNode> = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
  calendar: <><path d="M7 2v3m10-3v3M3.5 9h17" /><rect x="3" y="4" width="18" height="18" rx="3" /></>,
  notes: <path d="M6 3h9l4 4v14H6V3Zm8 0v5h5M9 12h7m-7 4h7" />,
  chat: <path d="M4 4h16v12H8l-4 4V4Zm4 5h8m-8 3h5" />,
  account: <><circle cx="12" cy="8" r="4" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  collapse: <path d="m14 7-5 5 5 5" />,
  expand: <path d="m10 7 5 5-5 5" />,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></>,
  moon: <path d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5a8.5 8.5 0 1 0 12 12Z" />,
  login: <><path d="M10 17l5-5-5-5m5 5H3" /><path d="M14 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5" /></>,
  eye: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></>,
  eyeOff: <><path d="m3 3 18 18M10.6 6.2A10.4 10.4 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-2.1 2.8M6.2 6.2C3.8 8 2.5 12 2.5 12s3.5 6 9.5 6a9.8 9.8 0 0 0 3-.5" /></>,
  arrowRight: <path d="M5 12h14m-5-5 5 5-5 5" />,
  check: <path d="m5 12 4 4L19 6" />,
  error: <><circle cx="12" cy="12" r="9" /><path d="M12 7v6m0 4h.01" /></>,
  warning: <><path d="M10.3 3.9 2.6 18a2 2 0 0 0 1.8 3h15.2a2 2 0 0 0 1.8-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4m0 4h.01" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6m0-10h.01" /></>,
}

export function Icon({ name, className = 'size-5' }: IconProps) {
  return <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">{paths[name]}</svg>
}

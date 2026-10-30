import { useEffect, useState } from 'react'

import type { NavigationItem } from '../models/navigation'

const navigationItems: readonly NavigationItem[] = [
  { label: 'Tổng quan', icon: 'dashboard', to: '/dashboard', available: true },
  { label: 'Lịch trình', icon: 'calendar', to: '/calendar', available: false },
  { label: 'Ghi chú', icon: 'notes', to: '/notes', available: false },
  { label: 'Trò chuyện', icon: 'chat', to: '/chat', available: false },
  { label: 'Tài khoản', icon: 'account', to: '/account', available: true },
]

export function useAppShellViewModel() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const stored = localStorage.getItem('edutrack-sidebar')
    if (stored) return stored === 'collapsed'
    return false
  })
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 767px)').matches)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  useEffect(() => { localStorage.setItem('edutrack-sidebar', isCollapsed ? 'collapsed' : 'expanded') }, [isCollapsed])
  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)')
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches)
      if (!event.matches) setIsMobileSidebarOpen(false)
    }
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  return {
    isCollapsed: isMobile ? false : isCollapsed,
    isMobileSidebarOpen,
    navigationItems,
    toggleCollapsed: () => setIsCollapsed((current) => !current),
    openMobileSidebar: () => setIsMobileSidebarOpen(true),
    closeMobileSidebar: () => setIsMobileSidebarOpen(false),
  }
}

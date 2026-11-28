import type { PropsWithChildren } from 'react'
import { useLocation } from 'react-router-dom'

import { useAppShellViewModel } from '@/shared/viewmodels/useAppShellViewModel'
import { Footer } from '@/shared/components/layout/Footer'
import { Header } from '@/shared/components/layout/Header'
import { Sidebar } from '@/shared/components/layout/Sidebar'

export function AppShell({ children }: PropsWithChildren) {
  const viewModel = useAppShellViewModel()
  const location = useLocation()
  const isChatWorkspace = location.pathname === '/chat' || location.pathname.startsWith('/chat/')
  const isCalendarWorkspace = location.pathname === '/calendar' || location.pathname.startsWith('/calendar/')
  const isViewportWorkspace = isChatWorkspace || isCalendarWorkspace

  return (
    <div className={`min-h-screen transition-[padding] duration-300 ${isViewportWorkspace ? 'lg:h-dvh lg:min-h-0 lg:overflow-hidden' : ''} ${viewModel.isCollapsed ? 'md:pl-23' : 'md:pl-73'}`}>
      <Sidebar collapsed={viewModel.isCollapsed} items={viewModel.navigationItems} mobileOpen={viewModel.isMobileSidebarOpen} onCloseMobile={viewModel.closeMobileSidebar} onToggleCollapsed={viewModel.toggleCollapsed} />
      <div className={`flex min-h-screen flex-col ${isViewportWorkspace ? 'lg:h-dvh lg:min-h-0' : ''}`}>
        <Header onOpenSidebar={viewModel.openMobileSidebar} />
        <main className={isChatWorkspace ? 'flex-1 p-2 sm:p-6 lg:min-h-0 lg:pb-3' : isCalendarWorkspace ? 'flex-1 p-2 sm:p-4 lg:min-h-0 lg:overflow-hidden lg:px-5 lg:py-3' : 'flex-1 p-4 sm:p-6'}>{children}</main>
        {isViewportWorkspace ? <div className="lg:hidden"><Footer /></div> : <Footer />}
      </div>
    </div>
  )
}

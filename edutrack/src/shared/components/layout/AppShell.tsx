import type { PropsWithChildren } from 'react'

import { useAppShellViewModel } from '@/shared/viewmodels/useAppShellViewModel'
import { Footer } from '@/shared/components/layout/Footer'
import { Header } from '@/shared/components/layout/Header'
import { Sidebar } from '@/shared/components/layout/Sidebar'

export function AppShell({ children }: PropsWithChildren) {
  const viewModel = useAppShellViewModel()
  return (
    <div className={`min-h-screen transition-[padding] duration-300 ${viewModel.isCollapsed ? 'md:pl-23' : 'md:pl-73'}`}>
      <Sidebar collapsed={viewModel.isCollapsed} items={viewModel.navigationItems} mobileOpen={viewModel.isMobileSidebarOpen} onCloseMobile={viewModel.closeMobileSidebar} onToggleCollapsed={viewModel.toggleCollapsed} />
      <div className="flex min-h-screen flex-col"><Header onOpenSidebar={viewModel.openMobileSidebar} /><main className="flex-1 p-4 sm:p-6">{children}</main><Footer /></div>
    </div>
  )
}

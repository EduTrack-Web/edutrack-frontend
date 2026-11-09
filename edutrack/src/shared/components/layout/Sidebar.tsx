import { NavLink } from 'react-router-dom'

import type { NavigationItem } from '../../models/navigation'
import { Icon } from '../Icon'
import { Logo } from './Logo'

interface SidebarProps {
  collapsed: boolean
  items: readonly NavigationItem[]
  mobileOpen: boolean
  onCloseMobile: () => void
  onToggleCollapsed: () => void
}

export function Sidebar({ collapsed, items, mobileOpen, onCloseMobile, onToggleCollapsed }: SidebarProps) {
  return (
    <>
      {mobileOpen && <button aria-label="Đóng thanh điều hướng" className="fixed inset-0 z-40 bg-palette-950/30 backdrop-blur-[2px] md:hidden" type="button" onClick={onCloseMobile} />}
      <aside className={`glass-sidebar fixed inset-y-3 left-3 z-50 flex w-70 max-w-[calc(100vw-1.5rem)] flex-col rounded-[28px] px-3 py-4 transition-[transform,width] duration-300 ease-out ${mobileOpen ? 'translate-x-0' : '-translate-x-[calc(100%+1.5rem)]'} md:translate-x-0 ${collapsed ? 'md:w-20' : 'md:w-70'}`}>
        <div className={`flex min-h-12 items-center ${collapsed ? 'justify-center' : 'justify-between px-1'}`}>
          <Logo compact={collapsed} to="/dashboard" onClick={onCloseMobile} />
        </div>

        <nav aria-label="Điều hướng chính" className="mt-8 flex-1">
          {!collapsed && <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-palette-950/60 dark:text-palette-100/70">Không gian học tập</p>}
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.label}>
                {item.available ? (
                  <NavLink className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''} ${collapsed ? 'justify-center px-0' : ''}`} to={item.to} title={collapsed ? item.label : undefined} onClick={onCloseMobile}>
                    <Icon className="size-5 shrink-0" name={item.icon} />
                    {!collapsed && <span>{item.label}</span>}
                  </NavLink>
                ) : (
                  <div className={`sidebar-link cursor-default opacity-65 ${collapsed ? 'justify-center px-0' : ''}`} title={collapsed ? `${item.label} — sắp phát triển` : undefined}>
                    <Icon className="size-5 shrink-0" name={item.icon} />
                    {!collapsed && <><span>{item.label}</span><span className="ml-auto rounded-full bg-palette-950/10 px-2 py-0.5 text-[9px] font-bold uppercase dark:bg-white/10">Sau</span></>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <button className={`sidebar-link ${collapsed ? 'justify-center px-0' : ''}`} type="button" aria-label={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'} onClick={onToggleCollapsed}>
          <Icon name={collapsed ? 'expand' : 'collapse'} />
          {!collapsed && <span>Thu gọn</span>}
        </button>
      </aside>
    </>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '../../../modules/auth/viewmodels/useAuth'
import { useToast } from '../../viewmodels/useToast'
import { Icon } from '../Icon'
import { HeaderControls } from './HeaderControls'

const initials = (name: string): string => name.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]?.toUpperCase()).join('') || 'U'

interface HeaderProps { onOpenSidebar: () => void }

export function Header({ onOpenSidebar }: HeaderProps) {
  const { user, logout } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const close = (event: MouseEvent) => { if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const handleLogout = async () => {
    try { await logout(); navigate('/'); showToast('Bạn đã đăng xuất khỏi EduTrack.', 'success') }
    catch { showToast('Không thể đăng xuất lúc này. Vui lòng thử lại.', 'error') }
  }

  return (
    <header className="glass-header sticky top-3 z-30 mx-3 mt-3 flex min-h-16 items-center rounded-[22px] px-4 sm:mx-4 sm:px-6">
      <button aria-label="Mở thanh điều hướng" className="mr-3 grid size-11 shrink-0 place-items-center rounded-2xl text-palette-950 transition hover:bg-palette-100/70 dark:text-palette-100 dark:hover:bg-white/10 md:hidden" type="button" onClick={onOpenSidebar}><Icon name="menu" /></button>
      <div className="hidden min-w-0 sm:block"><p className="truncate text-sm font-extrabold text-palette-950 dark:text-white">Không gian học tập</p><p className="truncate text-xs text-palette-700 dark:text-palette-200">Chào {user?.fullName ?? 'bạn'}!</p></div>
      <div className="ml-auto flex items-center gap-2"><HeaderControls /><div className="relative" ref={menuRef}><button className="avatar-button" type="button" aria-label="Mở menu tài khoản" aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}>{user?.avatarUrl ? <img alt={`Avatar của ${user.fullName}`} className="size-full rounded-full object-cover" src={user.avatarUrl} referrerPolicy="no-referrer" /> : <span>{initials(user?.fullName ?? 'User')}</span>}</button>{menuOpen && <div className="glass-panel absolute right-0 top-14 w-56 rounded-2xl p-2 shadow-2xl"><div className="border-b border-palette-200/70 px-3 py-3 dark:border-white/10"><p className="truncate text-sm font-black text-palette-950 dark:text-white">{user?.fullName}</p><p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">@{user?.username}</p></div><Link className="account-menu-item mt-2" to="/account" onClick={() => setMenuOpen(false)}><Icon name="account" />Trang cá nhân</Link><button className="account-menu-item w-full text-red-700 dark:text-red-300" type="button" onClick={() => void handleLogout()}><Icon name="login" />Đăng xuất</button></div>}</div></div>
    </header>
  )
}

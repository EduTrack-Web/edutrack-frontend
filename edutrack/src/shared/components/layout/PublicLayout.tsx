import { Outlet, Link } from 'react-router-dom'

import { Icon } from '../Icon'
import { HeaderControls } from './HeaderControls'
import { Logo } from './Logo'

export function PublicLayout() {
  return (
    <div className="min-h-screen">
      <header className="glass-header fixed inset-x-3 top-3 z-40 mx-auto flex h-17 max-w-7xl items-center rounded-[22px] px-4 sm:px-6">
        <Logo hideTextOnMobile />
        <div className="ml-auto flex items-center gap-2"><HeaderControls /><Link className="primary-button h-11 px-3 sm:px-4" to="/login"><Icon name="login" /><span className="hidden sm:inline">Đăng nhập</span></Link></div>
      </header>
      <main className="min-h-screen pt-24"><Outlet /></main>
    </div>
  )
}

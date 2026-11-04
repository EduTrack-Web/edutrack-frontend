import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '../../../modules/auth/viewmodels/useAuth'
import { formatAvatarUrl } from '../../api/httpClient'
import { useToast } from '../../viewmodels/useToast'
import { ConfirmLogoutModal } from '../ConfirmLogoutModal'
import { Icon } from '../Icon'
import { HeaderControls } from './HeaderControls'

const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U'

const getUserTypeLabel = (type?: string): string => {
  switch (type) {
    case 'pupil':
      return 'Học sinh'
    case 'worker':
      return 'Người đi làm'
    case 'teacher':
      return 'Giảng viên'
    case 'other':
      return 'Tự do / Tự học'
    case 'student':
    default:
      return 'Sinh viên'
  }
}

interface HeaderProps {
  onOpenSidebar: () => void
}

interface NotificationItem {
  id: string
  title: string
  time: string
  unread: boolean
}

export function Header({ onOpenSidebar }: HeaderProps) {
  const { user, logout } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [menuOpen, setMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const menuRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(target)) {
        setNotifOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Thông báo mẫu thời gian thực
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    { id: '1', title: 'Hạn nộp Báo cáo đồ án tuần 8', time: '17:00 hôm nay', unread: true },
    { id: '2', title: 'Thực hành Lập trình Web - Phòng A3-201', time: '07:30 ngày mai', unread: true },
    { id: '3', title: 'Nhắc nhở họp nhóm đề tài EduTrack', time: '20:00 tối mai', unread: false },
  ])

  const unreadCount = notifications.filter((n) => n.unread).length

  // Ngày hiện tại định dạng Việt Nam
  const todayText = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'numeric',
  })

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
      showToast('Bạn đã đăng xuất khỏi EduTrack.', 'success')
      navigate('/login')
    } catch {
      showToast('Không thể đăng xuất lúc này. Vui lòng thử lại.', 'error')
    } finally {
      setIsLoggingOut(false)
      setIsLogoutModalOpen(false)
    }
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, unread: false })))
    showToast('Đã đánh dấu đã đọc tất cả thông báo.', 'info')
  }

  return (
    <>
      <header className="glass-header sticky top-3 z-30 mx-3 mt-3 flex min-h-16 items-center rounded-[22px] px-4 sm:mx-4 sm:px-6">
        {/* Nút mở Sidebar trên mobile */}
        <button
          aria-label="Mở thanh điều hướng"
          className="mr-3 grid size-11 shrink-0 place-items-center rounded-2xl text-palette-950 transition hover:bg-palette-100/70 dark:text-palette-100 dark:hover:bg-white/10 md:hidden"
          type="button"
          onClick={onOpenSidebar}
        >
          <Icon name="menu" />
        </button>

        {/* Thông tin chào đón & Ngày tháng thực tế */}
        <div className="hidden min-w-0 sm:block">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-extrabold text-palette-950 dark:text-white">
              Không gian học tập
            </p>
            <span className="hidden rounded-full border border-palette-500/20 bg-palette-100/70 px-2 py-0.5 text-[10px] font-bold text-palette-700 capitalize lg:inline-block dark:border-white/10 dark:bg-white/10 dark:text-palette-200">
              {todayText}
            </span>
          </div>
          <p className="truncate text-xs text-palette-700 dark:text-palette-200">
            Chào {user?.fullName ?? 'bạn'}, chúc bạn học tập hiệu quả!
          </p>
        </div>

        {/* Cụm điều khiển bên phải */}
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {/* Chuông thông báo */}
          <div className="relative" ref={notifRef}>
            <button
              aria-expanded={notifOpen}
              aria-label="Xem thông báo"
              className="glass-icon-button relative size-11"
              type="button"
              onClick={() => {
                setNotifOpen((prev) => !prev)
                setMenuOpen(false)
              }}
            >
              <Icon className="size-5 text-palette-900 dark:text-palette-100" name="bell" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid size-5 place-items-center rounded-full bg-red-600 text-[10px] font-black text-white shadow-xs">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown Thông báo */}
            {notifOpen && (
              <div className="glass-panel absolute right-0 top-14 w-80 max-w-[calc(100vw-2rem)] rounded-2xl p-3 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-palette-200/70 pb-2.5 px-2 dark:border-white/10">
                  <span className="text-xs font-black uppercase tracking-wider text-palette-900 dark:text-white">
                    Thông báo học tập
                  </span>
                  {unreadCount > 0 && (
                    <button
                      className="text-[11px] font-bold text-palette-700 hover:underline dark:text-palette-200"
                      type="button"
                      onClick={markAllAsRead}
                    >
                      Đánh dấu đã đọc
                    </button>
                  )}
                </div>

                <div className="mt-2 divide-y divide-palette-200/50 dark:divide-white/5">
                  {notifications.map((item) => (
                    <div
                      className={`flex items-start gap-3 p-2.5 rounded-xl transition ${
                        item.unread ? 'bg-palette-100/60 dark:bg-white/5' : 'hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                      key={item.id}
                    >
                      <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-lg bg-palette-200/80 text-palette-700 dark:bg-white/10 dark:text-palette-200">
                        <Icon className="size-3.5" name="clock" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-palette-950 dark:text-white">
                          {item.title}
                        </p>
                        <p className="text-[10px] text-palette-700 dark:text-palette-200">
                          {item.time}
                        </p>
                      </div>
                      {item.unread && (
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-palette-700 dark:bg-palette-200" />
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-2 border-t border-palette-200/70 pt-2 text-center dark:border-white/10">
                  <Link
                    className="text-xs font-bold text-palette-700 hover:underline dark:text-palette-200"
                    to="/calendar"
                    onClick={() => setNotifOpen(false)}
                  >
                    Xem tất cả lời nhắc trên lịch →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Cụm chuyển đổi giao diện Dark/Light */}
          <HeaderControls />

          {/* Menu Tài khoản */}
          <div className="relative" ref={menuRef}>
            <button
              aria-expanded={menuOpen}
              aria-label="Mở menu tài khoản"
              className="avatar-button relative"
              type="button"
              onClick={() => {
                setMenuOpen((prev) => !prev)
                setNotifOpen(false)
              }}
            >
              {user?.avatarUrl ? (
                <img
                  alt={`Avatar của ${user.fullName}`}
                  className="size-full rounded-full object-cover"
                  referrerPolicy="no-referrer"
                  src={formatAvatarUrl(user.avatarUrl)}
                />
              ) : (
                <span>{initials(user?.fullName ?? 'User')}</span>
              )}
              {/* Chấm trạng thái Online */}
              <span
                aria-hidden="true"
                className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-white bg-emerald-500 shadow-xs dark:border-palette-900"
              />
            </button>

            {/* Dropdown Menu tài khoản */}
            {menuOpen && (
              <div className="glass-panel absolute right-0 top-14 w-60 rounded-2xl p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                <div className="border-b border-palette-200/70 px-3 py-3 dark:border-white/10">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm font-black text-palette-950 dark:text-white">
                      {user?.fullName}
                    </p>
                    <span className="rounded-full bg-palette-100 px-2 py-0.5 text-[9px] font-black uppercase text-palette-700 dark:bg-white/10 dark:text-palette-200">
                      {user?.role === 'admin' ? 'Admin' : getUserTypeLabel(user?.userType)}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                    @{user?.username}
                  </p>
                </div>

                <div className="py-1">
                  <Link
                    className="account-menu-item"
                    to="/account"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Icon name="account" />
                    <span>Trang cá nhân</span>
                  </Link>
                  <Link
                    className="account-menu-item"
                    to="/calendar"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Icon name="calendar" />
                    <span>Lịch học của tôi</span>
                  </Link>
                </div>

                <div className="border-t border-palette-200/70 pt-1 dark:border-white/10">
                  <button
                    className="account-menu-item w-full text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      setIsLogoutModalOpen(true)
                    }}
                  >
                    <Icon name="login" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Modal Xác nhận đăng xuất (UC-03) */}
      <ConfirmLogoutModal
        isLoading={isLoggingOut}
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={() => void handleConfirmLogout()}
      />
    </>
  )
}

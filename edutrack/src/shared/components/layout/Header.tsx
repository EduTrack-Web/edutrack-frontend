import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '@/modules/auth/viewmodels/useAuth'
import { useNotifications } from '@/modules/notifications/viewmodels/useNotifications'
import { formatAvatarUrl } from '@/shared/api/httpClient'
import { useToast } from '@/shared/viewmodels/useToast'
import { ConfirmLogoutModal } from '@/shared/components/ConfirmLogoutModal'
import { Icon } from '@/shared/components/Icon'
import { HeaderControls } from '@/shared/components/layout/HeaderControls'

const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U'

const formatTimeAgo = (dateStr: string): string => {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'Vừa xong'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin} phút trước`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours} giờ trước`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays} ngày trước`
  return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
}

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

export function Header({ onOpenSidebar }: HeaderProps) {
  const { user, logout } = useAuth()
  const { notifications, unreadCount, refresh, markAsRead, markAllAsRead, respondInvitation } =
    useNotifications()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [menuOpen, setMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const menuRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

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

  return (
    <>
      <header className="glass-header sticky top-3 z-30 mx-3 mt-3 flex min-h-16 items-center rounded-[22px] px-4 sm:mx-4 sm:px-6">
        <button
          aria-label="Mở thanh điều hướng"
          className="mr-3 grid size-11 shrink-0 place-items-center rounded-2xl text-palette-950 transition hover:bg-palette-100/70 dark:text-palette-100 dark:hover:bg-white/10 md:hidden"
          type="button"
          onClick={onOpenSidebar}
        >
          <Icon name="menu" />
        </button>

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

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div className="relative" ref={notifRef}>
            <button
              aria-expanded={notifOpen}
              aria-label="Xem thông báo"
              className="glass-icon-button relative size-11"
              type="button"
              onClick={() => {
                setNotifOpen((prev) => {
                  const nextState = !prev
                  if (nextState) {
                    void refresh()
                  }
                  return nextState
                })
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

                <div className="mt-2 max-h-80 overflow-y-auto divide-y divide-palette-200/50 dark:divide-white/5">
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-xs text-palette-600 dark:text-palette-300">
                      Hiện tại bạn không có thông báo nào.
                    </div>
                  ) : (
                    notifications.map((item) => {
                      const isCalendarNotif = item.type.startsWith('event_') || Boolean(item.eventId)
                      return (
                        <div
                          className={`flex flex-col gap-2 p-2.5 rounded-xl cursor-pointer transition ${
                            !item.isRead ? 'bg-palette-100/60 dark:bg-white/5' : 'hover:bg-black/5 dark:hover:bg-white/5'
                          }`}
                          key={item.id}
                          onClick={() => {
                            if (!item.isRead) void markAsRead(item.id)
                            setNotifOpen(false)
                            if (item.link) {
                              navigate(item.link)
                            } else if (isCalendarNotif) {
                              navigate('/calendar')
                              window.dispatchEvent(new CustomEvent('edutrack-calendar-refresh'))
                            }
                          }}
                        >
                        <div className="flex items-start gap-2.5">
                          <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-palette-200/80 text-palette-700 dark:bg-white/10 dark:text-palette-200">
                            <Icon
                              className="size-3.5"
                              name={item.type === 'event_invitation' ? 'account' : 'clock'}
                            />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-palette-950 dark:text-white leading-tight">
                              {item.title}
                            </p>
                            <p className="mt-0.5 text-[11px] text-palette-800 dark:text-palette-200 line-clamp-2">
                              {item.message}
                            </p>
                            <p className="mt-1 text-[10px] text-palette-500 dark:text-palette-400">
                              {formatTimeAgo(item.createdAt)}
                            </p>
                          </div>
                          {!item.isRead && (
                            <span className="mt-1 size-2 shrink-0 rounded-full bg-blue-600 dark:bg-blue-400" />
                          )}
                        </div>

                        {item.type === 'event_invitation' && item.eventId && (
                          <div className="ml-9 flex items-center gap-2 pt-1">
                            {item.metadata?.status === 'accepted' ? (
                              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                ✓ Đã chấp nhận tham gia
                              </span>
                            ) : item.metadata?.status === 'declined' ? (
                              <span className="text-[11px] font-bold text-rose-500">
                                ✕ Đã từ chối lời mời
                              </span>
                            ) : (
                              <>
                                <button
                                  className="rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-blue-700 active:scale-95"
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    void respondInvitation(item.id, item.eventId!, 'accepted')
                                  }}
                                >
                                  Tham gia
                                </button>
                                <button
                                  className="rounded-lg border border-palette-300 bg-white/50 px-2.5 py-1 text-[11px] font-semibold text-palette-700 transition hover:bg-palette-200/60 dark:border-white/10 dark:bg-white/10 dark:text-palette-200"
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    void respondInvitation(item.id, item.eventId!, 'declined')
                                  }}
                                >
                                  Từ chối
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  }))}
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

          <HeaderControls />

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
              <span
                aria-hidden="true"
                className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-white bg-emerald-500 shadow-xs dark:border-palette-900"
              />
            </button>

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

      <ConfirmLogoutModal
        isLoading={isLoggingOut}
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={() => void handleConfirmLogout()}
      />
    </>
  )
}

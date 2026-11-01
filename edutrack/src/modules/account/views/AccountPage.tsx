import { useState } from 'react'
import { Link } from 'react-router-dom'

import { Icon } from '../../../shared/components/Icon'
import { useAuth } from '../../auth/viewmodels/useAuth'

const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U'

export function AccountPage() {
  const { user, logout } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  if (!user) return null

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
    } catch {
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 sm:space-y-8">
      {/* 1. BANNER HỒ SƠ TÀI KHOẢN */}
      <section className="dashboard-banner p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-16 size-72 rounded-full border border-palette-500/15 bg-gradient-to-br from-palette-200/30 to-palette-700/10 blur-[1px] dark:border-white/10 dark:bg-white/5" />
        <div className="pointer-events-none absolute -right-2 top-20 size-40 rounded-full border border-palette-700/10 bg-palette-100/40 dark:border-white/5 dark:bg-white/5" />

        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-palette-700/20 bg-palette-100/90 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-palette-700 shadow-xs dark:border-palette-200/20 dark:bg-palette-700/25 dark:text-palette-200">
            <Icon className="size-3.5" name="sparkles" />
            Hồ sơ người dùng
          </span>

          <h1 className="mt-4 text-3xl font-black tracking-tight text-palette-900 sm:text-4xl dark:text-white">
            Thông tin tài khoản
          </h1>

          <p className="mt-3 max-w-xl text-sm font-medium leading-7 text-[#476685] sm:text-base dark:text-palette-200/85">
            Quản lý thông tin định danh cá nhân, trạng thái xác thực và bảo mật phiên đăng nhập của bạn trên EduTrack.
          </p>
        </div>
      </section>

      {/* 2. THẺ TỔNG QUAN PROFILE (HERO CARD) */}
      <section className="content-card p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            {/* Avatar lớn viền kính */}
            <div className="relative size-24 shrink-0 overflow-hidden rounded-3xl border-2 border-white/80 bg-gradient-to-br from-palette-900 to-palette-700 shadow-md ring-4 ring-palette-200/50 dark:border-white/20 dark:ring-palette-700/30 sm:size-28">
              {user.avatarUrl ? (
                <img
                  alt={`Avatar của ${user.fullName}`}
                  className="size-full object-cover"
                  referrerPolicy="no-referrer"
                  src={user.avatarUrl}
                />
              ) : (
                <div className="grid size-full place-items-center text-2xl font-black text-palette-100 sm:text-3xl">
                  {initials(user.fullName)}
                </div>
              )}
            </div>

            {/* Thông tin tên và trạng thái */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-2xl font-black tracking-tight text-palette-900 sm:text-3xl dark:text-white">
                  {user.fullName}
                </h2>
                <span className="rounded-full bg-palette-100 px-3 py-0.5 text-xs font-black uppercase tracking-wider text-palette-700 dark:bg-white/10 dark:text-palette-200">
                  {user.role === 'admin' ? 'Quản trị viên' : 'Sinh viên'}
                </span>
              </div>

              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                @{user.username}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                {/* Trạng thái hoạt động */}
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                  </span>
                  {user.status === 'active' ? 'Đang hoạt động' : 'Chờ xác thực'}
                </span>

                {/* Trạng thái xác thực email */}
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${
                    user.emailVerified
                      ? 'border-palette-700/20 bg-palette-100/80 text-palette-700 dark:border-palette-200/20 dark:bg-palette-700/25 dark:text-palette-200'
                      : 'border-amber-500/20 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-950/40 dark:text-amber-300'
                  }`}
                >
                  <Icon className="size-3.5" name={user.emailVerified ? 'checkCircle' : 'info'} />
                  {user.emailVerified ? 'Email đã xác thực' : 'Email chưa xác thực'}
                </span>
              </div>
            </div>
          </div>

          {/* Nút Đăng xuất */}
          <div className="sm:self-center">
            <button
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-rose-200/80 bg-rose-50/70 px-5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 hover:shadow-xs active:scale-95 disabled:opacity-50 dark:border-rose-400/20 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-950/50 sm:w-auto"
              disabled={isLoggingOut}
              onClick={handleLogout}
              type="button"
            >
              <Icon className="size-4" name="login" />
              <span>{isLoggingOut ? 'Đang đăng xuất…' : 'Đăng xuất tài khoản'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* 3. LƯỚI 2 CỘT CHI TIẾT THÔNG TIN VÀ BẢO MẬT */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Cột 1: Thông tin liên lạc & Định danh */}
        <section className="content-card p-6 sm:p-7">
          <div className="flex items-center gap-3 border-b border-palette-200/70 pb-4 dark:border-white/10">
            <span className="grid size-10 place-items-center rounded-xl bg-palette-100 text-palette-700 dark:bg-white/10 dark:text-palette-200">
              <Icon className="size-5" name="account" />
            </span>
            <div>
              <h3 className="text-base font-extrabold text-palette-900 dark:text-white">
                Thông tin cá nhân
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Chi tiết định danh và liên hệ người dùng
              </p>
            </div>
          </div>

          <dl className="mt-5 space-y-4">
            <div className="flex flex-col justify-between rounded-xl border border-palette-200/50 bg-white/50 p-3.5 sm:flex-row sm:items-center dark:border-white/10 dark:bg-white/5">
              <dt className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Họ và tên
              </dt>
              <dd className="mt-1 text-sm font-bold text-palette-900 sm:mt-0 dark:text-white">
                {user.fullName}
              </dd>
            </div>

            <div className="flex flex-col justify-between rounded-xl border border-palette-200/50 bg-white/50 p-3.5 sm:flex-row sm:items-center dark:border-white/10 dark:bg-white/5">
              <dt className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Tên đăng nhập
              </dt>
              <dd className="mt-1 font-mono text-sm font-bold text-palette-900 sm:mt-0 dark:text-white">
                @{user.username}
              </dd>
            </div>

            <div className="flex flex-col justify-between rounded-xl border border-palette-200/50 bg-white/50 p-3.5 sm:flex-row sm:items-center dark:border-white/10 dark:bg-white/5">
              <dt className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Địa chỉ Email
              </dt>
              <dd className="mt-1 flex items-center gap-2 text-sm font-bold text-palette-900 sm:mt-0 dark:text-white">
                <span>{user.email}</span>
                {user.emailVerified && (
                  <span className="text-emerald-600 dark:text-emerald-400" title="Email đã xác thực">
                    <Icon className="size-4" name="checkCircle" />
                  </span>
                )}
              </dd>
            </div>

            <div className="flex flex-col justify-between rounded-xl border border-palette-200/50 bg-white/50 p-3.5 sm:flex-row sm:items-center dark:border-white/10 dark:bg-white/5">
              <dt className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Số điện thoại
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-600 sm:mt-0 dark:text-slate-300">
                {user.phone || 'Chưa cập nhật'}
              </dd>
            </div>

            <div className="flex flex-col justify-between rounded-xl border border-palette-200/50 bg-white/50 p-3.5 sm:flex-row sm:items-center dark:border-white/10 dark:bg-white/5">
              <dt className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Mã định danh ID
              </dt>
              <dd className="mt-1 font-mono text-xs text-slate-500 sm:mt-0 dark:text-slate-400">
                {user.id}
              </dd>
            </div>
          </dl>
        </section>

        {/* Cột 2: An toàn & Bảo mật phiên làm việc */}
        <section className="content-card p-6 sm:p-7">
          <div className="flex items-center gap-3 border-b border-palette-200/70 pb-4 dark:border-white/10">
            <span className="grid size-10 place-items-center rounded-xl bg-palette-100 text-palette-700 dark:bg-white/10 dark:text-palette-200">
              <Icon className="size-5" name="lock" />
            </span>
            <div>
              <h3 className="text-base font-extrabold text-palette-900 dark:text-white">
                Bảo mật & Phiên làm việc
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Thiết lập an toàn và trạng thái xác thực
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {/* Xác thực 2 bước qua Email */}
            <div className="rounded-xl border border-palette-200/50 bg-white/50 p-4 dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-palette-900 dark:text-white">
                    Xác thực 2 bước (2FA)
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Mã xác nhận OTP qua email khi đăng nhập
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase ${
                    user.twoFactorEnabled
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'
                  }`}
                >
                  {user.twoFactorEnabled ? 'Đã kích hoạt' : 'Chưa bật'}
                </span>
              </div>
            </div>

            {/* Phiên làm việc HttpOnly Cookie */}
            <div className="rounded-xl border border-palette-200/50 bg-white/50 p-4 dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-palette-900 dark:text-white">
                    Phiên làm việc bảo mật
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    HttpOnly Cookie chống rò rỉ XSS và CSRF
                  </p>
                </div>
                <span className="rounded-full bg-palette-100 px-2.5 py-0.5 text-[11px] font-black uppercase text-palette-700 dark:bg-white/10 dark:text-palette-200">
                  Chuẩn an toàn
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-palette-200/40 text-[11px] text-slate-500 dark:border-white/5 dark:text-slate-400">
                <span>• Access Token: 15 phút</span>
                <span>• Refresh Token: 7 ngày</span>
                <span>• SameSite: Lax</span>
              </div>
            </div>

            {/* Mật khẩu & Quyền */}
            <div className="rounded-xl border border-palette-200/50 bg-white/50 p-4 dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-palette-900 dark:text-white">
                    Mật khẩu tài khoản
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Bảo vệ bằng thuật toán mã hóa Argon2/BCrypt
                  </p>
                </div>
                <span className="rounded-xl border border-palette-200/80 bg-white/80 px-3 py-1 text-xs font-bold text-palette-700 dark:border-white/10 dark:bg-white/10 dark:text-palette-200">
                  Đã bảo vệ
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* 4. CÁC KHÔNG GIAN DỊCH VỤ LIÊN KẾT */}
      <section className="space-y-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-palette-700 dark:text-palette-200">
            Dịch vụ liên kết
          </p>
          <h3 className="text-xl font-black tracking-tight text-palette-900 sm:text-2xl dark:text-white">
            Trạng thái không gian học tập của bạn
          </h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Link
            className="content-card group flex items-center justify-between p-5 transition hover:-translate-y-0.5 hover:shadow-md"
            to="/calendar"
          >
            <div className="flex items-center gap-3.5">
              <span className="grid size-11 place-items-center rounded-2xl border border-palette-200/80 bg-palette-100 text-palette-700 dark:border-white/10 dark:bg-white/10 dark:text-palette-200">
                <Icon className="size-5" name="calendar" />
              </span>
              <div>
                <p className="text-sm font-bold text-palette-900 dark:text-white">
                  Không gian Lịch trình
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Thời khóa biểu & Deadline
                </p>
              </div>
            </div>
            <Icon className="size-4 text-palette-500 transition group-hover:translate-x-1" name="arrowRight" />
          </Link>

          <Link
            className="content-card group flex items-center justify-between p-5 transition hover:-translate-y-0.5 hover:shadow-md"
            to="/notes"
          >
            <div className="flex items-center gap-3.5">
              <span className="grid size-11 place-items-center rounded-2xl border border-palette-200/80 bg-palette-100 text-palette-700 dark:border-white/10 dark:bg-white/10 dark:text-palette-200">
                <Icon className="size-5" name="notes" />
              </span>
              <div>
                <p className="text-sm font-bold text-palette-900 dark:text-white">
                  Sổ tay Ghi chú
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ghi chú học phần & Thẻ tag
                </p>
              </div>
            </div>
            <Icon className="size-4 text-palette-500 transition group-hover:translate-x-1" name="arrowRight" />
          </Link>

          <Link
            className="content-card group flex items-center justify-between p-5 transition hover:-translate-y-0.5 hover:shadow-md"
            to="/chat"
          >
            <div className="flex items-center gap-3.5">
              <span className="grid size-11 place-items-center rounded-2xl border border-palette-200/80 bg-palette-100 text-palette-700 dark:border-white/10 dark:bg-white/10 dark:text-palette-200">
                <Icon className="size-5" name="chat" />
              </span>
              <div>
                <p className="text-sm font-bold text-palette-900 dark:text-white">
                  Kênh Trao đổi nhóm
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Thảo luận thời gian thực
                </p>
              </div>
            </div>
            <Icon className="size-4 text-palette-500 transition group-hover:translate-x-1" name="arrowRight" />
          </Link>
        </div>
      </section>
    </div>
  )
}

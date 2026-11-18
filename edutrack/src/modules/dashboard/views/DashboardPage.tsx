import { Link } from 'react-router-dom'

import { Icon } from '@/shared/components/Icon'
import { useDashboardViewModel } from '@/modules/dashboard/viewmodels/useDashboardViewModel'

export function DashboardPage() {
  const vm = useDashboardViewModel()

  return (
    <div className="mx-auto max-w-6xl space-y-6 sm:space-y-8">
      {/* 1. BANNER CHÀO MỪNG VÀ QUICK ACTIONS */}
      <section className="dashboard-banner p-6 sm:p-8">
        {/* Vòng tròn trang trí mờ tinh tế */}
        <div className="pointer-events-none absolute -right-12 -top-16 size-72 rounded-full border border-palette-500/15 bg-gradient-to-br from-palette-200/30 to-palette-700/10 blur-[1px] dark:border-white/10 dark:bg-white/5" />
        <div className="pointer-events-none absolute -right-2 top-20 size-40 rounded-full border border-palette-700/10 bg-palette-100/40 dark:border-white/5 dark:bg-white/5" />

        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-palette-700/20 bg-palette-100/90 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-palette-700 shadow-xs dark:border-palette-200/20 dark:bg-palette-700/25 dark:text-palette-200">
            <Icon className="size-3.5" name="sparkles" />
            Không gian học tập thông minh
          </span>

          <h1 className="mt-4 text-3xl font-black tracking-tight text-palette-900 sm:text-4xl lg:text-[2.6rem] dark:text-white">
            {vm.title}
          </h1>

          <p className="mt-3 max-w-xl text-sm font-medium leading-7 text-[#476685] sm:text-base dark:text-palette-200/85">
            {vm.description}
          </p>

          {/* Phím tắt thao tác nhanh (Quick Actions) */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link className="primary-button h-11 px-4 text-xs sm:text-sm" to="/calendar">
              <Icon className="size-4" name="plus" />
              <span>Thêm lịch học</span>
            </Link>
            <Link className="secondary-button h-11 px-4 text-xs sm:text-sm" to="/notes">
              <Icon className="size-4" name="notes" />
              <span>Tạo ghi chú</span>
            </Link>
            <Link className="secondary-button h-11 px-4 text-xs sm:text-sm" to="/chat">
              <Icon className="size-4" name="chat" />
              <span>Vào nhóm trao đổi</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. HÀNG 4 THẺ CHỈ SỐ NHANH (QUICK METRIC CARDS) */}
      <section aria-label="Chỉ số tổng quan">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {vm.stats.map((stat) => (
            <div
              key={stat.label}
              className="content-card group relative p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-palette-500/10"
            >
              <div className="flex items-center justify-between">
                <span className="grid size-11 place-items-center rounded-2xl border border-palette-200/80 bg-palette-100/90 text-palette-700 shadow-xs dark:border-white/10 dark:bg-white/10 dark:text-palette-200">
                  <Icon className="size-5" name={stat.icon} />
                </span>
                {stat.badge && (
                  <span className="rounded-full bg-palette-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-palette-700 dark:bg-white/10 dark:text-palette-200">
                    {stat.badge}
                  </span>
                )}
              </div>

              <div className="mt-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {stat.label}
                </p>
                <p className="mt-1 text-2xl font-black tracking-tight text-palette-900 dark:text-white">
                  {stat.value}
                </p>
                <p className="mt-1 text-xs text-[#52708f] dark:text-slate-400">
                  {stat.subtext}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. KHỐI 2 CỘT NỘI DUNG: LỊCH TRÌNH HÔM NAY & TIẾN ĐỘ / GHI CHÚ GẦN ĐÂY */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Cột trái (7 cols): Lịch trình học tập hôm nay */}
        <section className="content-card p-6 lg:col-span-7">
          <div className="flex items-center justify-between border-b border-palette-200/70 pb-4 dark:border-white/10">
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-xl bg-palette-100 text-palette-700 dark:bg-white/10 dark:text-palette-200">
                <Icon className="size-4.5" name="calendar" />
              </span>
              <div>
                <h2 className="text-base font-extrabold text-palette-900 dark:text-white">
                  Lịch trình hôm nay
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Các mốc sự kiện và bài vở cần chú ý
                </p>
              </div>
            </div>
            <Link
              className="text-xs font-bold text-palette-700 hover:underline dark:text-palette-200"
              to="/calendar"
            >
              Mở lịch đầy đủ →
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {vm.upcomingEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-start justify-between rounded-2xl border border-palette-200/60 bg-white/60 p-4 transition hover:bg-white/90 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                        event.type === 'deadline'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                          : 'bg-palette-100 text-palette-700 dark:bg-white/10 dark:text-palette-200'
                      }`}
                    >
                      {event.type === 'deadline' ? 'Deadline' : 'Tiết học'}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {event.time}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-palette-950 dark:text-white">
                    {event.title}
                  </h3>
                  {event.location && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      📍 {event.location}
                    </p>
                  )}
                </div>

                <Link
                  className="rounded-xl border border-palette-200/80 p-2 text-palette-700 hover:bg-palette-100 dark:border-white/10 dark:text-palette-200 dark:hover:bg-white/10"
                  title="Xem chi tiết"
                  to="/calendar"
                >
                  <Icon className="size-4" name="arrowRight" />
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Cột phải (5 cols): Tiến độ & Ghi chú gần đây */}
        <section className="space-y-6 lg:col-span-5">
          {/* Tiến độ ngày */}
          <div className="content-card p-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-palette-700 dark:text-palette-200">
                Tiến độ ngày hôm nay
              </p>
              <span className="text-sm font-black text-palette-900 dark:text-white">
                3/4 hoàn thành
              </span>
            </div>
            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-palette-100 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-palette-700 to-palette-500 transition-all duration-500"
                style={{ width: '75%' }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Bạn chỉ còn 1 công việc nữa để đạt mục tiêu ngày!
            </p>
          </div>

          {/* Ghi chú gần đây */}
          <div className="content-card p-6">
            <div className="flex items-center justify-between border-b border-palette-200/70 pb-3 dark:border-white/10">
              <h2 className="text-sm font-extrabold text-palette-900 dark:text-white">
                Ghi chú học tập mới nhất
              </h2>
              <Link
                className="text-xs font-bold text-palette-700 hover:underline dark:text-palette-200"
                to="/notes"
              >
                Xem tất cả →
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {vm.recentNotes.map((note) => (
                <Link
                  key={note.id}
                  className="block rounded-xl border border-palette-200/50 bg-white/50 p-3 transition hover:bg-white/90 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                  to="/notes"
                >
                  <p className="text-xs font-bold text-palette-950 dark:text-white">
                    {note.title}
                  </p>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="font-medium text-palette-700 dark:text-palette-200">
                      {note.subject}
                    </span>
                    <span>{note.timeAgo}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* 4. CÁC KHÔNG GIAN HỌC TẬP CỐT LÕI (CORE LEARNING SPACES) */}
      <section className="space-y-4" aria-labelledby="core-modules-title">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-palette-700 dark:text-palette-200">
            Hệ sinh thái EduTrack
          </p>
          <h2
            id="core-modules-title"
            className="text-2xl font-black tracking-tight text-palette-900 sm:text-3xl dark:text-white"
          >
            Mọi công cụ học tập trong cùng một nơi
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {vm.modules.map((module, index) => (
            <article
              key={module.name}
              className="content-card group relative flex flex-col justify-between p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-palette-500/10"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-xl border border-palette-200/80 bg-palette-100/90 text-sm font-black text-palette-700 shadow-xs dark:border-white/10 dark:bg-white/10 dark:text-palette-200">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="rounded-full bg-palette-100/80 px-2.5 py-0.5 text-[10px] font-bold text-palette-700 dark:bg-white/10 dark:text-palette-200">
                    {module.tag}
                  </span>
                </div>

                <h3 className="mt-5 text-lg font-extrabold text-palette-900 dark:text-white">
                  {module.name}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#52708f] dark:text-slate-300">
                  {module.description}
                </p>
              </div>

              <div className="mt-6 border-t border-palette-200/70 pt-4 dark:border-white/10">
                <Link
                  className="inline-flex items-center gap-1.5 text-xs font-black text-palette-700 transition group-hover:translate-x-1 dark:text-palette-200"
                  to={module.path}
                >
                  <span>Mở không gian</span>
                  <Icon className="size-3.5" name="arrowRight" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

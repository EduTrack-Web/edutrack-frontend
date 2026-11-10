import { Icon } from '@/shared/components/Icon'
import { useCalendarViewModel } from '@/modules/calendar/viewmodels/useCalendarViewModel'

export function CalendarPage() {
  const vm = useCalendarViewModel()

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Banner không gian học tập */}
      <section className="dashboard-banner p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-16 size-72 rounded-full border border-palette-500/15 bg-gradient-to-br from-palette-200/30 to-palette-700/10 blur-[1px] dark:border-white/10 dark:bg-white/5" />
        
        <div className="relative max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-palette-700/20 bg-palette-100/90 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-palette-700 shadow-xs dark:border-palette-200/20 dark:bg-palette-700/25 dark:text-palette-200">
              <Icon className="size-3.5" name="calendar" />
              Không gian Lịch trình
            </span>
            <span className="rounded-full bg-palette-900/10 px-2.5 py-0.5 text-xs font-semibold text-palette-900 dark:bg-white/10 dark:text-palette-200">
              Phụ trách: {vm.assignedMember}
            </span>
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-palette-900 sm:text-4xl dark:text-white">
            {vm.title}
          </h1>
          <p className="mt-3 max-w-xl text-sm font-medium leading-7 text-[#476685] sm:text-base dark:text-palette-200/85">
            {vm.description}
          </p>
        </div>
      </section>

      {/* Vùng nội dung cấu trúc sẵn sàng */}
      <section className="content-card p-6 sm:p-8">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <span className="grid size-16 place-items-center rounded-2xl border border-palette-200/80 bg-palette-100 text-palette-700 shadow-xs dark:border-white/10 dark:bg-white/10 dark:text-palette-200">
            <Icon className="size-8" name="calendar" />
          </span>
          <h2 className="mt-5 text-xl font-extrabold text-palette-900 dark:text-white">
            Khu vực làm việc của Thành viên A
          </h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300">
            Cấu trúc MVVM, Router và API Service đã được kết nối hoàn chỉnh. Thành viên A có thể bắt đầu xây dựng giao diện thời khóa biểu và lịch sự kiện ngay tại đây.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <span className="rounded-xl border border-palette-200/80 bg-white/70 px-4 py-2 text-xs font-bold text-palette-900 shadow-xs dark:border-white/10 dark:bg-white/5 dark:text-palette-100">
              ✓ Thời khóa biểu tuần / tháng
            </span>
            <span className="rounded-xl border border-palette-200/80 bg-white/70 px-4 py-2 text-xs font-bold text-palette-900 shadow-xs dark:border-white/10 dark:bg-white/5 dark:text-palette-100">
              ✓ Lịch thi & Deadline
            </span>
            <span className="rounded-xl border border-palette-200/80 bg-white/70 px-4 py-2 text-xs font-bold text-palette-900 shadow-xs dark:border-white/10 dark:bg-white/5 dark:text-palette-100">
              ✓ Lời nhắc nhở học tập
            </span>
          </div>
        </div>
      </section>
    </div>
  )
}

import { useState } from 'react'
import { Icon } from '../../../../shared/components/Icon'
import type { CalendarCategory } from '../../models/calendar.types'
import { EXTENDED_CALENDAR_COLORS } from '../../viewmodels/useEventModalViewModel'

interface CalendarSidebarProps {
  categories: CalendarCategory[]
  selectedCategoryIds: string[]
  currentDate: Date
  onSelectDate: (date: Date) => void
  onToggleCategoryVisibility: (categoryId: string) => void
  onShowOnlyCategory: (categoryId: string) => void
  onShowAllCategories: () => void
  onOpenCreateEvent: () => void
  onOpenCreateCategory: () => void
  onOpenEditCategory: (category: CalendarCategory) => void
  onQuickChangeColor: (categoryId: string, color: string) => void
  onDeleteCategory: (categoryId: string) => void
}

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

export function CalendarSidebar({
  categories,
  selectedCategoryIds,
  currentDate,
  onSelectDate,
  onToggleCategoryVisibility,
  onShowOnlyCategory,
  onShowAllCategories,
  onOpenCreateEvent,
  onOpenCreateCategory,
  onOpenEditCategory,
  onQuickChangeColor,
  onDeleteCategory,
}: CalendarSidebarProps) {
  const [activeMenuCatId, setActiveMenuCatId] = useState<string | null>(null)
  const [miniCalMonth, setMiniCalMonth] = useState<Date>(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1))

  // Tính toán các ngày cho Mini Calendar tháng
  const year = miniCalMonth.getFullYear()
  const month = miniCalMonth.getMonth()
  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)

  // Điều chỉnh ngày bắt đầu tuần (T2 là 0)
  let startDayOfWeek = firstDayOfMonth.getDay() - 1
  if (startDayOfWeek === -1) startDayOfWeek = 6

  const daysInMonth = lastDayOfMonth.getDate()
  const totalSlots = Math.ceil((startDayOfWeek + daysInMonth) / 7) * 7

  const today = new Date()
  const isToday = (d: number) =>
    today.getDate() === d && today.getMonth() === month && today.getFullYear() === year

  const isSelected = (d: number) =>
    currentDate.getDate() === d && currentDate.getMonth() === month && currentDate.getFullYear() === year

  return (
    <aside className="w-full shrink-0 space-y-5 md:w-64">
      {/* Nút Tạo mới sự kiện lớn */}
      <button
        className="flex w-full items-center justify-center gap-3 rounded-full border border-slate-200/90 bg-white py-3.5 pr-6 pl-4 text-sm font-bold text-slate-800 shadow-md transition-all hover:bg-slate-50 hover:shadow-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 active:scale-[0.99] dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
        onClick={onOpenCreateEvent}
        type="button"
      >
        <span className="grid size-7 place-items-center rounded-full bg-blue-50 text-blue-600 dark:bg-white/10 dark:text-blue-400">
          <Icon className="size-4" name="plus" />
        </span>
        <span>Tạo mới sự kiện</span>
      </button>

      {/* Mini Calendar (Bộ lịch tháng nhỏ gọn) */}
      <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-3.5 shadow-2xs backdrop-blur-xs dark:border-white/10 dark:bg-white/5">
        <div className="flex items-center justify-between pb-2">
          <span className="text-xs font-bold text-slate-800 capitalize dark:text-white">
            {miniCalMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
          </span>
          <div className="flex items-center gap-1">
            <button
              aria-label="Tháng trước"
              className="grid size-6 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10"
              onClick={() => setMiniCalMonth(new Date(year, month - 1, 1))}
              type="button"
            >
              <Icon className="size-3.5" name="arrowLeft" />
            </button>
            <button
              aria-label="Tháng sau"
              className="grid size-6 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10"
              onClick={() => setMiniCalMonth(new Date(year, month + 1, 1))}
              type="button"
            >
              <Icon className="size-3.5" name="arrowRight" />
            </button>
          </div>
        </div>

        {/* Tiêu đề thứ trong tuần */}
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-400">
          {WEEKDAYS.map((wd) => (
            <div key={wd}>{wd}</div>
          ))}
        </div>

        {/* Lưới các ngày trong tháng */}
        <div className="mt-1 grid grid-cols-7 gap-1 text-center text-xs">
          {Array.from({ length: totalSlots }).map((_, idx) => {
            const dayNum = idx - startDayOfWeek + 1
            const isCurrentMonth = dayNum > 0 && dayNum <= daysInMonth

            if (!isCurrentMonth) {
              return <div className="size-7" key={idx} />
            }

            const todayActive = isToday(dayNum)
            const selectedActive = isSelected(dayNum)

            return (
              <button
                className={`grid size-7 place-items-center rounded-full text-xs font-medium transition-colors ${
                  todayActive
                    ? 'bg-blue-600 font-bold text-white shadow-xs'
                    : selectedActive
                      ? 'border border-blue-600 bg-blue-50 font-bold text-blue-700 dark:bg-white/15 dark:text-white'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10'
                }`}
                key={idx}
                onClick={() => onSelectDate(new Date(year, month, dayNum))}
                type="button"
              >
                {dayNum}
              </button>
            )
          })}
        </div>
      </div>

      {/* Danh mục "Lịch của tôi" */}
      <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-3.5 shadow-2xs backdrop-blur-xs dark:border-white/10 dark:bg-white/5">
        <div className="flex items-center justify-between pb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Lịch của tôi
            </span>
            {selectedCategoryIds.length < categories.length && (
              <button
                className="text-[11px] font-bold text-blue-600 hover:underline dark:text-blue-400"
                onClick={onShowAllCategories}
                title="Hiển thị tất cả các lịch"
                type="button"
              >
                Hiện tất cả
              </button>
            )}
          </div>
          <button
            aria-label="Thêm lịch mới"
            className="grid size-6 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
            onClick={onOpenCreateCategory}
            title="Tạo lịch mới"
            type="button"
          >
            <Icon className="size-4" name="plus" />
          </button>
        </div>

        <div className="space-y-1">
          {activeMenuCatId && (
            <div
              className="fixed inset-0 z-10"
              onClick={() => setActiveMenuCatId(null)}
            />
          )}

          {categories.length === 0 ? (
            <p className="py-2 text-xs text-slate-400">Chưa có lịch nào.</p>
          ) : (
            categories.map((cat) => {
              const isChecked = selectedCategoryIds.includes(cat.id)
              const isMenuOpen = activeMenuCatId === cat.id

              return (
                <div className="relative" key={cat.id}>
                  <div className="group flex items-center justify-between rounded-xl px-2 py-1.5 transition-colors hover:bg-slate-100/80 dark:hover:bg-white/5">
                    <label className="flex flex-1 cursor-pointer items-center gap-2.5 select-none" htmlFor={`cat-${cat.id}`}>
                      <input
                        checked={isChecked}
                        className="sr-only"
                        id={`cat-${cat.id}`}
                        onChange={() => onToggleCategoryVisibility(cat.id)}
                        type="checkbox"
                      />
                      <span
                        className={`grid size-4.5 shrink-0 place-items-center rounded-sm transition-all ${
                          isChecked ? 'text-white' : 'border-2 border-slate-300 bg-transparent dark:border-white/20'
                        }`}
                        style={{
                          backgroundColor: isChecked ? cat.color : 'transparent',
                          borderColor: isChecked ? cat.color : undefined,
                        }}
                      >
                        {isChecked && <Icon className="size-3" name="check" />}
                      </span>

                      <span
                        className={`truncate text-xs font-semibold ${
                          isChecked ? 'text-slate-800 dark:text-white' : 'text-slate-400 dark:text-slate-500'
                        }`}
                        title={cat.name}
                      >
                        {cat.name}
                      </span>
                    </label>

                    {/* Nút 3 chấm mở menu thao tác bổ trợ */}
                    <button
                      aria-label="Tùy chọn lịch"
                      className="grid size-6 place-items-center rounded-md text-slate-400 opacity-60 transition-opacity hover:bg-slate-200 hover:text-slate-700 group-hover:opacity-100 dark:hover:bg-white/10 dark:hover:text-white"
                      onClick={() => setActiveMenuCatId(isMenuOpen ? null : cat.id)}
                      type="button"
                    >
                      <Icon className="size-3.5" name="moreVertical" />
                    </button>
                  </div>

                  {/* Dropdown Menu thao tác bổ trợ của Lịch */}
                  {isMenuOpen && (
                    <div
                      className="absolute right-0 z-20 mt-1 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-[#021024]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="space-y-1 border-b border-slate-100 pb-2 dark:border-white/10">
                        {/* Chỉ hiện lịch này */}
                        <button
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/10"
                          onClick={() => {
                            setActiveMenuCatId(null)
                            onShowOnlyCategory(cat.id)
                          }}
                          type="button"
                        >
                          <Icon className="size-3.5" name="eye" />
                          Chỉ hiện lịch này
                        </button>

                        {/* Hiện tất cả các lịch */}
                        {selectedCategoryIds.length < categories.length && (
                          <button
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/10"
                            onClick={() => {
                              setActiveMenuCatId(null)
                              onShowAllCategories()
                            }}
                            type="button"
                          >
                            <Icon className="size-3.5" name="checkCircle" />
                            Hiện tất cả các lịch
                          </button>
                        )}

                        <button
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/10"
                          onClick={() => {
                            setActiveMenuCatId(null)
                            onOpenEditCategory(cat)
                          }}
                          type="button"
                        >
                          <Icon className="size-3.5" name="edit" />
                          Chỉnh sửa lịch
                        </button>

                        {!cat.isDefault && (
                          <button
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                            onClick={() => {
                              setActiveMenuCatId(null)
                              onDeleteCategory(cat.id)
                            }}
                            type="button"
                          >
                            <Icon className="size-3.5" name="trash" />
                            Xóa lịch
                          </button>
                        )}
                      </div>

                      {/* Đổi màu nhanh inline */}
                      <div className="pt-2">
                        <span className="block px-2 text-[10px] font-bold text-slate-400 uppercase">
                          Đổi màu nhanh
                        </span>
                        <div className="mt-1.5 grid grid-cols-6 gap-1 px-1">
                          {EXTENDED_CALENDAR_COLORS.slice(0, 12).map((c) => (
                            <button
                              aria-label={`Đổi màu ${c}`}
                              className="size-4.5 rounded-full transition-transform hover:scale-120"
                              key={c}
                              onClick={() => {
                                onQuickChangeColor(cat.id, c)
                                setActiveMenuCatId(null)
                              }}
                              style={{ backgroundColor: c }}
                              type="button"
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </aside>
  )
}

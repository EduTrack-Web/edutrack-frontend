import { useState } from 'react'
import { Icon } from '../../../../shared/components/Icon'
import type { CalendarCategory, CalendarEvent, EventPriority, RecurrenceFrequency, ReminderMethod } from '../../models/calendar.types'
import {
  GOOGLE_CALENDAR_COLORS,
  useEventModalViewModel,
  type ReminderUnit,
} from '../../viewmodels/useEventModalViewModel'

interface EventModalProps {
  isOpen: boolean
  initialEvent?: CalendarEvent | null
  initialDate?: Date | null
  categories: CalendarCategory[]
  onClose: () => void
  onSaved: () => void
  onOpenCreateCategory?: () => void
}

const PRIORITY_ITEMS: { value: EventPriority; label: string; icon: string; color: string }[] = [
  { value: 'urgent', label: 'Khẩn cấp', icon: '🔥', color: 'bg-red-50 text-red-700 border-red-300 dark:bg-red-950/40 dark:text-red-300' },
  { value: 'high', label: 'Ưu tiên cao', icon: '⚠️', color: 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300' },
  { value: 'medium', label: 'Trung bình', icon: '📘', color: 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300' },
  { value: 'low', label: 'Thấp', icon: '⚪', color: 'bg-slate-50 text-slate-700 border-slate-300 dark:bg-white/10 dark:text-slate-300' },
]

const WEEKDAY_BUTTONS: { day: number; label: string }[] = [
  { day: 1, label: 'T2' },
  { day: 2, label: 'T3' },
  { day: 3, label: 'T4' },
  { day: 4, label: 'T5' },
  { day: 5, label: 'T6' },
  { day: 6, label: 'T7' },
  { day: 0, label: 'CN' },
]

export function EventModal(props: EventModalProps) {
  const { isOpen, initialEvent, onClose, onOpenCreateCategory } = props
  const vm = useEventModalViewModel(props)
  const [showTooltip, setShowTooltip] = useState(false)

  if (!isOpen) return null

  const isTask = vm.entryType === 'task'
  const isEditing = Boolean(initialEvent)

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-2xs transition-opacity sm:p-6"
      role="dialog"
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-xl flex-col rounded-2xl border border-slate-200/80 bg-white shadow-2xl dark:border-white/10 dark:bg-[#021024]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Chuyển đổi Tab và Nút Lưu */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-3.5 dark:border-white/10">
          <div className="flex items-center gap-2">
            <button
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                !isTask
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
              onClick={() => vm.handleTabChange('event')}
              type="button"
            >
              📅 Sự kiện
            </button>
            <button
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                isTask
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
              onClick={() => vm.handleTabChange('task')}
              type="button"
            >
              ⏰ Nhiệm vụ & Deadline
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="rounded-full bg-blue-600 px-5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
              disabled={vm.isSubmitting}
              onClick={vm.handleSubmit}
              type="button"
            >
              {vm.isSubmitting ? 'Đang lưu...' : isEditing ? 'Cập nhật' : 'Lưu'}
            </button>
            <button
              aria-label="Đóng"
              className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
              onClick={onClose}
              type="button"
            >
              <Icon className="size-4" name="close" />
            </button>
          </div>
        </div>

        {/* Form Body - Cuộn mượt */}
        <form className="flex-1 space-y-4 overflow-y-auto p-6" noValidate onSubmit={vm.handleSubmit}>
          {vm.generalError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300">
              {vm.generalError}
            </div>
          )}

          {/* Tiêu đề */}
          <div>
            <input
              aria-describedby={vm.errors.title ? 'title-error' : undefined}
              aria-invalid={Boolean(vm.errors.title)}
              className="w-full border-b border-slate-200 pb-2 text-xl font-bold text-slate-900 outline-hidden transition-colors placeholder:text-slate-400 focus:border-blue-600 dark:border-white/15 dark:text-white"
              onChange={(e) => vm.setTitle(e.target.value)}
              placeholder={isTask ? 'Thêm tiêu đề nhiệm vụ...' : 'Thêm tiêu đề sự kiện...'}
              type="text"
              value={vm.title}
            />
            {vm.errors.title && (
              <p className="mt-1.5 text-xs font-semibold text-rose-500" id="title-error">
                {vm.errors.title}
              </p>
            )}
          </div>

          {/* ======================= TAB SỰ KIỆN ======================= */}
          {!isTask ? (
            <div className="space-y-4">
              {/* Thời gian Sự kiện: Bắt đầu ➔ Kết thúc */}
              <div className="space-y-2.5 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-white/5 dark:bg-white/5">
                <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Thời gian diễn ra
                </span>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <input
                    aria-label="Ngày bắt đầu"
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-800 outline-hidden focus:border-blue-600 dark:border-white/10 dark:bg-white/5 dark:text-white"
                    onChange={(e) => vm.setStartDate(e.target.value)}
                    type="date"
                    value={vm.startDate}
                  />

                  {!vm.isAllDay && (
                    <>
                      <input
                        aria-label="Giờ bắt đầu"
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 font-medium text-slate-800 outline-hidden focus:border-blue-600 dark:border-white/10 dark:bg-white/5 dark:text-white"
                        onChange={(e) => vm.setStartTime(e.target.value)}
                        type="time"
                        value={vm.startTime}
                      />
                      <span className="text-slate-400">tới</span>
                      <input
                        aria-label="Giờ kết thúc"
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 font-medium text-slate-800 outline-hidden focus:border-blue-600 dark:border-white/10 dark:bg-white/5 dark:text-white"
                        onChange={(e) => vm.setEndTime(e.target.value)}
                        type="time"
                        value={vm.endTime}
                      />
                    </>
                  )}

                  <input
                    aria-label="Ngày kết thúc"
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-800 outline-hidden focus:border-blue-600 dark:border-white/10 dark:bg-white/5 dark:text-white"
                    onChange={(e) => vm.setEndDate(e.target.value)}
                    type="date"
                    value={vm.endDate}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <label className="flex cursor-pointer items-center gap-2 select-none" htmlFor="event-is-allday">
                    <input
                      checked={vm.isAllDay}
                      className="size-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
                      id="event-is-allday"
                      onChange={(e) => vm.setIsAllDay(e.target.checked)}
                      type="checkbox"
                    />
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Cả ngày</span>
                  </label>

                  {/* Lặp lại chuẩn Google Calendar */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <select
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-hidden dark:border-white/10 dark:bg-white/5 dark:text-white"
                      onChange={(e) => vm.handleSelectRecurrence(e.target.value as RecurrenceFrequency)}
                      value={vm.recurrenceFreq}
                    >
                      <option value="none">Không lặp lại</option>
                      <option value="daily">Hàng ngày</option>
                      <option value="weekly">Hàng tuần</option>
                      <option value="monthly">Hàng tháng</option>
                      <option value="yearly">Hàng năm</option>
                      <option value="weekdays">Mọi ngày trong tuần (T2 - T6)</option>
                      <option value="custom">Tùy chỉnh...</option>
                    </select>

                    {vm.recurrenceFreq === 'custom' && (
                      <button
                        className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300"
                        onClick={() => vm.setIsCustomRecurrenceOpen(true)}
                        title="Chỉnh sửa cấu hình lặp lại"
                        type="button"
                      >
                        ⚙️ {vm.getRecurrenceLabel()}
                      </button>
                    )}
                  </div>
                </div>

                {(vm.errors.startDate || vm.errors.endDate) && (
                  <p className="text-xs font-semibold text-rose-500">
                    {vm.errors.startDate || vm.errors.endDate}
                  </p>
                )}
              </div>

              {/* Link Google Meet / Trực tuyến */}
              <div className="flex items-center gap-3">
                <span className="grid size-8 shrink-0 place-items-center text-slate-400">
                  <Icon className="size-4.5" name="link" />
                </span>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-800 outline-hidden transition-all focus:border-blue-600 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white"
                  onChange={(e) => vm.setOnlineMeetingUrl(e.target.value)}
                  placeholder="Thêm hội nghị truyền hình trên Google Meet, Zoom..."
                  type="url"
                  value={vm.onlineMeetingUrl}
                />
              </div>

              {/* Vị trí / Phòng học */}
              <div className="flex items-center gap-3">
                <span className="grid size-8 shrink-0 place-items-center text-slate-400">
                  <Icon className="size-4.5" name="mapPin" />
                </span>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-800 outline-hidden transition-all focus:border-blue-600 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white"
                  onChange={(e) => vm.setLocation(e.target.value)}
                  placeholder="Thêm vị trí, phòng học..."
                  type="text"
                  value={vm.location}
                />
              </div>
            </div>
          ) : (
            /* ======================= TAB NHIỆM VỤ / DEADLINE ======================= */
            <div className="space-y-4">
              {/* Hạn chót hoàn thành (Deadline) */}
              <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-white/5 dark:bg-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Hạn chót hoàn thành (Deadline)
                  </span>
                  <label className="flex cursor-pointer items-center gap-1.5 select-none" htmlFor="task-is-allday">
                    <input
                      checked={vm.isAllDay}
                      className="size-3.5 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
                      id="task-is-allday"
                      onChange={(e) => vm.setIsAllDay(e.target.checked)}
                      type="checkbox"
                    />
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Cả ngày</span>
                  </label>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <input
                    aria-label="Ngày hạn chót"
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-800 outline-hidden focus:border-blue-600 dark:border-white/10 dark:bg-white/5 dark:text-white"
                    onChange={(e) => vm.setDeadlineDate(e.target.value)}
                    type="date"
                    value={vm.deadlineDate}
                  />

                  {!vm.isAllDay && (
                    <input
                      aria-label="Giờ hạn chót"
                      className="w-28 rounded-lg border border-slate-200 bg-white px-2 py-1.5 font-medium text-slate-800 outline-hidden focus:border-blue-600 dark:border-white/10 dark:bg-white/5 dark:text-white"
                      onChange={(e) => vm.setDeadlineTime(e.target.value)}
                      type="time"
                      value={vm.deadlineTime}
                    />
                  )}
                </div>
              </div>

              {/* Mức độ ưu tiên */}
              <div>
                <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Mức độ ưu tiên
                </span>
                <div className="mt-1.5 grid grid-cols-4 gap-2">
                  {PRIORITY_ITEMS.map((item) => {
                    const isSelected = vm.priority === item.value
                    return (
                      <button
                        className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-bold transition-all ${
                          isSelected
                            ? `${item.color} ring-2 ring-blue-600 ring-offset-1`
                            : 'border-slate-200 bg-white/70 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300'
                        }`}
                        key={item.value}
                        onClick={() => vm.setPriority(item.value)}
                        type="button"
                      >
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Checklist đầu việc con (Subtasks) */}
              <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-white/5 dark:bg-white/5">
                <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Các bước cần làm (Checklist {vm.checklist.length > 0 ? `• ${vm.checklist.filter((i) => i.isCompleted).length}/${vm.checklist.length}` : ''})
                </span>

                {/* Danh sách các subtask */}
                {vm.checklist.length > 0 && (
                  <div className="space-y-1.5">
                    {vm.checklist.map((item) => (
                      <div className="flex items-center justify-between gap-2 rounded-lg bg-white p-2 shadow-2xs dark:bg-white/5" key={item.id}>
                        <label className="flex flex-1 cursor-pointer items-center gap-2 select-none" htmlFor={`check-${item.id}`}>
                          <input
                            checked={item.isCompleted}
                            className="size-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
                            id={`check-${item.id}`}
                            onChange={() => vm.handleToggleSubtask(item.id)}
                            type="checkbox"
                          />
                          <span className={`text-xs font-medium ${item.isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-white'}`}>
                            {item.title}
                          </span>
                        </label>
                        <button
                          aria-label="Xóa bước này"
                          className="text-slate-400 hover:text-rose-500"
                          onClick={() => vm.handleRemoveSubtask(item.id)}
                          type="button"
                        >
                          <Icon className="size-3.5" name="close" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Thêm subtask mới */}
                <div className="flex items-center gap-2">
                  <input
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 outline-hidden focus:border-blue-600 dark:border-white/10 dark:bg-white/5 dark:text-white"
                    onChange={(e) => vm.setNewSubtaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        vm.handleAddSubtask()
                      }
                    }}
                    placeholder="Thêm bước thực hiện (ví dụ: Vẽ kiến trúc)..."
                    type="text"
                    value={vm.newSubtaskTitle}
                  />
                  <button
                    className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-300 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                    onClick={vm.handleAddSubtask}
                    type="button"
                  >
                    + Thêm
                  </button>
                </div>
              </div>

              {/* Link nộp bài / Tài liệu */}
              <div className="flex items-center gap-3">
                <span className="grid size-8 shrink-0 place-items-center text-slate-400">
                  <Icon className="size-4.5" name="link" />
                </span>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-800 outline-hidden transition-all focus:border-blue-600 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white"
                  onChange={(e) => vm.setSubmissionUrl(e.target.value)}
                  placeholder="Link nộp bài LMS, Google Drive, GitHub repo..."
                  type="url"
                  value={vm.submissionUrl}
                />
              </div>
            </div>
          )}

          {/* ======================= PHẦN NHẮC NHỞ (CHO CẢ SỰ KIỆN VÀ NHIỆM VỤ) ======================= */}
          <div className="flex items-start gap-3">
            <span className="mt-1 grid size-8 shrink-0 place-items-center text-slate-400">
              <Icon className="size-4.5" name="bell" />
            </span>
            <div className="flex-1 space-y-2">
              {vm.reminders.map((rem) => (
                <div className="flex items-center gap-2" key={rem.id}>
                  {/* Loại thông báo */}
                  <select
                    className="rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-hidden dark:border-white/10 dark:bg-white/5 dark:text-white"
                    onChange={(e) => vm.handleUpdateReminder(rem.id, 'method', e.target.value as ReminderMethod)}
                    value={rem.method}
                  >
                    <option value="in-app">Thông báo</option>
                    <option value="email">Email</option>
                  </select>

                  {/* Số lượng */}
                  <input
                    className="w-16 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-hidden dark:border-white/10 dark:bg-white/5 dark:text-white"
                    max={999}
                    min={1}
                    onChange={(e) => vm.handleUpdateReminder(rem.id, 'quantity', Math.max(1, Number(e.target.value) || 1))}
                    type="number"
                    value={rem.quantity}
                  />

                  {/* Đơn vị thời gian */}
                  <select
                    className="rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-hidden dark:border-white/10 dark:bg-white/5 dark:text-white"
                    onChange={(e) => vm.handleUpdateReminder(rem.id, 'unit', e.target.value as ReminderUnit)}
                    value={rem.unit}
                  >
                    <option value="minutes">phút</option>
                    <option value="hours">giờ</option>
                    <option value="days">ngày</option>
                    <option value="weeks">tuần</option>
                  </select>

                  {/* Nút xóa nhắc nhở */}
                  <button
                    aria-label="Xóa thông báo"
                    className="grid size-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
                    onClick={() => vm.handleRemoveReminder(rem.id)}
                    type="button"
                  >
                    <Icon className="size-3.5" name="close" />
                  </button>
                </div>
              ))}

              <button
                className="text-xs font-bold text-blue-600 hover:underline dark:text-blue-400"
                onClick={vm.handleAddReminder}
                type="button"
              >
                + Thêm thông báo
              </button>
            </div>
          </div>

          {/* ======================= CHỌN LỊCH VÀ CHỌN MÀU RIÊNG ======================= */}
          <div className="flex items-center gap-3 border-t border-slate-100 pt-3 dark:border-white/10">
            <span className="grid size-8 shrink-0 place-items-center text-slate-400">
              <Icon className="size-4.5" name="calendar" />
            </span>
            <div className="relative flex flex-1 items-center gap-2">
              {/* Dropdown danh mục Lịch */}
              <select
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-semibold text-slate-800 outline-hidden transition-all focus:border-blue-600 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white"
                onChange={(e) => vm.handleCalendarSelect(e.target.value)}
                value={vm.calendarId}
              >
                {props.categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    ● {cat.name}
                  </option>
                ))}
              </select>

              {/* Nút chọn màu riêng chuẩn Google Calendar */}
              <div className="relative">
                <button
                  aria-label="Chọn màu thẻ"
                  className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-xs transition-all hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                  onClick={() => vm.setIsColorPickerOpen(!vm.isColorPickerOpen)}
                  title="Tùy chỉnh màu sắc thẻ sự kiện"
                  type="button"
                >
                  <span
                    className="size-4 rounded-full shadow-2xs"
                    style={{ backgroundColor: vm.activeColor }}
                  />
                  <Icon className="size-3 text-slate-400" name="chevronDown" />
                </button>

                {/* Popover Bảng màu Google Calendar */}
                {vm.isColorPickerOpen && (
                  <div
                    className="absolute right-0 bottom-full z-30 mb-2 w-56 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-white/10 dark:bg-[#021024]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between pb-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      <span>Màu sắc thẻ</span>
                      {vm.color && (
                        <button
                          className="text-blue-600 hover:underline dark:text-blue-400"
                          onClick={() => {
                            vm.setColor('')
                            vm.setIsColorPickerOpen(false)
                          }}
                          type="button"
                        >
                          Theo màu lịch
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-6 gap-2">
                      {GOOGLE_CALENDAR_COLORS.map((hex) => {
                        const isSelected = (vm.color || vm.activeColor).toLowerCase() === hex.toLowerCase()
                        return (
                          <button
                            aria-label={`Chọn màu ${hex}`}
                            className={`size-6 rounded-full transition-transform hover:scale-110 ${
                              isSelected ? 'ring-2 ring-blue-600 ring-offset-2' : ''
                            }`}
                            key={hex}
                            onClick={() => {
                              vm.setColor(hex)
                              vm.setIsColorPickerOpen(false)
                            }}
                            style={{ backgroundColor: hex }}
                            type="button"
                          />
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {onOpenCreateCategory && (
                <button
                  className="shrink-0 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  onClick={onOpenCreateCategory}
                  type="button"
                >
                  + Lịch mới
                </button>
              )}
            </div>
          </div>

          {/* ======================= CHẾ ĐỘ RẢNH / BẬN VÀ HIỂN THỊ ======================= */}
          <div className="flex items-center gap-3">
            <span className="grid size-8 shrink-0 place-items-center text-slate-400">
              <Icon className="size-4.5" name="briefcase" />
            </span>
            <div className="flex flex-1 items-center gap-2">
              {/* Rảnh / Bận */}
              <select
                className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs font-medium text-slate-800 outline-hidden dark:border-white/10 dark:bg-white/5 dark:text-white"
                onChange={(e) => vm.setAvailability(e.target.value as 'busy' | 'free')}
                value={vm.availability}
              >
                <option value="busy">Bận</option>
                <option value="free">Rảnh</option>
              </select>

              {/* Chế độ hiển thị */}
              <select
                className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs font-medium text-slate-800 outline-hidden dark:border-white/10 dark:bg-white/5 dark:text-white"
                onChange={(e) => vm.setVisibility(e.target.value as 'default' | 'public' | 'private')}
                value={vm.visibility}
              >
                <option value="default">Chế độ hiển thị mặc định</option>
                <option value="public">Công khai</option>
                <option value="private">Riêng tư</option>
              </select>

              {/* Tooltip trợ giúp */}
              <div className="relative">
                <button
                  aria-label="Trợ giúp trạng thái rảnh/bận"
                  className="grid size-6 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-200"
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                  type="button"
                >
                  <Icon className="size-3.5" name="info" />
                </button>
                {showTooltip && (
                  <div className="absolute bottom-full left-1/2 z-30 mb-2 w-52 -translate-x-1/2 rounded-lg bg-slate-900 p-2 text-center text-[11px] text-white shadow-lg dark:bg-slate-800">
                    Bận / Rảnh giúp thông báo tình trạng sẵn sàng của bạn trong khung giờ này cho mọi người biết.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ======================= MÔ TẢ ======================= */}
          <div className="flex items-start gap-3">
            <span className="mt-1 grid size-8 shrink-0 place-items-center text-slate-400">
              <Icon className="size-4.5" name="notes" />
            </span>
            <textarea
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs text-slate-800 outline-hidden transition-all focus:border-blue-600 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white"
              onChange={(e) => vm.setDescription(e.target.value)}
              placeholder="Thêm nội dung mô tả, ghi chú chi tiết..."
              rows={3}
              value={vm.description}
            />
          </div>
        </form>

        {/* ======================= MODAL TÙY CHỈNH LẶP LẠI (CUSTOM RECURRENCE) ======================= */}
        {vm.isCustomRecurrenceOpen && (
          <div
            aria-modal="true"
            className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-2xs"
            role="dialog"
          >
            <div
              className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#021024]"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Tùy chỉnh sự lặp lại
              </h3>

              {/* Lặp lại mỗi X (ngày/tuần/tháng/năm) */}
              <div className="flex items-center gap-3 text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Lặp lại mỗi:</span>
                <input
                  className="w-16 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-800 outline-hidden dark:border-white/10 dark:bg-white/5 dark:text-white"
                  min={1}
                  onChange={(e) => vm.setCustomInterval(Math.max(1, Number(e.target.value) || 1))}
                  type="number"
                  value={vm.customInterval}
                />
                <select
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-800 outline-hidden dark:border-white/10 dark:bg-white/5 dark:text-white"
                  onChange={(e) => vm.setCustomUnit(e.target.value as 'day' | 'week' | 'month' | 'year')}
                  value={vm.customUnit}
                >
                  <option value="day">ngày</option>
                  <option value="week">tuần</option>
                  <option value="month">tháng</option>
                  <option value="year">năm</option>
                </select>
              </div>

              {/* Lặp lại vào các ngày trong tuần (chỉ hiển thị khi đơn vị là tuần) */}
              {vm.customUnit === 'week' && (
                <div className="space-y-1.5">
                  <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Lặp lại vào:
                  </span>
                  <div className="flex items-center gap-1.5">
                    {WEEKDAY_BUTTONS.map((btn) => {
                      const isSelected = vm.customDaysOfWeek.includes(btn.day)
                      return (
                        <button
                          className={`size-8 rounded-full text-xs font-bold transition-all ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300'
                          }`}
                          key={btn.day}
                          onClick={() => vm.handleToggleCustomDay(btn.day)}
                          type="button"
                        >
                          {btn.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Kết thúc */}
              <div className="space-y-2.5 pt-2">
                <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Kết thúc:
                </span>
                <div className="space-y-2 text-xs">
                  {/* Không bao giờ */}
                  <label className="flex cursor-pointer items-center gap-2" htmlFor="end-never">
                    <input
                      checked={vm.customEndCondition === 'never'}
                      className="size-4 text-blue-600"
                      id="end-never"
                      name="endCondition"
                      onChange={() => vm.setCustomEndCondition('never')}
                      type="radio"
                    />
                    <span className="text-slate-700 dark:text-slate-300">Không bao giờ</span>
                  </label>

                  {/* Vào ngày */}
                  <div className="flex items-center gap-2">
                    <label className="flex cursor-pointer items-center gap-2" htmlFor="end-until">
                      <input
                        checked={vm.customEndCondition === 'until'}
                        className="size-4 text-blue-600"
                        id="end-until"
                        name="endCondition"
                        onChange={() => vm.setCustomEndCondition('until')}
                        type="radio"
                      />
                      <span className="text-slate-700 dark:text-slate-300">Vào ngày</span>
                    </label>
                    <input
                      aria-label="Ngày kết thúc lặp lại"
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-hidden dark:border-white/10 dark:bg-white/5 dark:text-white"
                      disabled={vm.customEndCondition !== 'until'}
                      onChange={(e) => vm.setCustomUntilDate(e.target.value)}
                      type="date"
                      value={vm.customUntilDate}
                    />
                  </div>

                  {/* Sau X lần */}
                  <div className="flex items-center gap-2">
                    <label className="flex cursor-pointer items-center gap-2" htmlFor="end-count">
                      <input
                        checked={vm.customEndCondition === 'count'}
                        className="size-4 text-blue-600"
                        id="end-count"
                        name="endCondition"
                        onChange={() => vm.setCustomEndCondition('count')}
                        type="radio"
                      />
                      <span className="text-slate-700 dark:text-slate-300">Sau</span>
                    </label>
                    <input
                      aria-label="Số lần lặp lại"
                      className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-hidden dark:border-white/10 dark:bg-white/5 dark:text-white"
                      disabled={vm.customEndCondition !== 'count'}
                      min={1}
                      onChange={(e) => vm.setCustomCount(Math.max(1, Number(e.target.value) || 1))}
                      type="number"
                      value={vm.customCount}
                    />
                    <span className="text-slate-500">lần lặp</span>
                  </div>
                </div>
              </div>

              {/* Nút hành động */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/10">
                <button
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
                  onClick={vm.handleCancelCustomRecurrence}
                  type="button"
                >
                  Hủy
                </button>
                <button
                  className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700"
                  onClick={vm.handleConfirmCustomRecurrence}
                  type="button"
                >
                  Xong
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

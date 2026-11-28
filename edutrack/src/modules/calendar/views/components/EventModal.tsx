import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '@/modules/i18n/viewmodels/useTranslation'
import { Icon } from '../../../../shared/components/Icon'
import type { CalendarCategory, CalendarEvent, EventPriority, RecurrenceFrequency, ReminderMethod } from '../../models/calendar.types'
import {
  UNIFIED_EVENT_COLORS,
  useEventModalViewModel,
  type ReminderUnit,
} from '../../viewmodels/useEventModalViewModel'
import { COMMON_TIMEZONES, PRIORITY_CONFIG } from '../../models/calendarConstants'
import { RecurringConfirmationDialog } from './RecurringConfirmationDialog'
import { RecurrenceScopeModal } from './RecurrenceScopeModal'
import { ConfirmDeleteGoogleEventModal } from './ConfirmDeleteGoogleEventModal'
import { EventShareModal } from './EventShareModal'
import { ReadOnlyEventDetailCard } from './ReadOnlyEventDetailCard'
import { calendarApi } from '../../services/calendarApi'

interface EventModalProps {
  isOpen: boolean
  initialEvent?: CalendarEvent | null
  initialDate?: Date | null
  isFirstOccurrence?: boolean
  categories: CalendarCategory[]
  onClose: () => void
  onSaved: () => void
  onOpenCreateCategory?: () => void
}

const PRIORITY_ITEMS: { value: EventPriority; label: string; dotColor: string }[] = [
  { value: 'urgent', label: 'Khẩn cấp', dotColor: 'bg-red-500' },
  { value: 'high', label: 'Ưu tiên cao', dotColor: 'bg-amber-500' },
  { value: 'medium', label: 'Trung bình', dotColor: 'bg-blue-500' },
  { value: 'low', label: 'Thấp', dotColor: 'bg-slate-400' },
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
  const { t } = useTranslation()
  const [showTooltip, setShowTooltip] = useState(false)
  const [pendingGoogleDeleteScope, setPendingGoogleDeleteScope] = useState<
    'local_only' | 'both' | null
  >(null)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [isCalendarDropdownOpen, setIsCalendarDropdownOpen] = useState(false)
  const [handlingRequestId, setHandlingRequestId] = useState<string | null>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const calendarDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isCalendarDropdownOpen) return
    const handleOutside = (e: MouseEvent) => {
      if (calendarDropdownRef.current && !calendarDropdownRef.current.contains(e.target as Node)) {
        setIsCalendarDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [isCalendarDropdownOpen])

  useEffect(() => {
    if (isOpen && vm.canModify) {
      const timer = window.setTimeout(() => {
        if (titleInputRef.current) {
          titleInputRef.current.focus()
          const len = titleInputRef.current.value.length
          titleInputRef.current.setSelectionRange(len, len)
        }
      }, 60)
      return () => window.clearTimeout(timer)
    }
  }, [isOpen, vm.canModify])

  if (!isOpen) return null

  const isTask = vm.entryType === 'task'
  const isEditing = Boolean(initialEvent)
  const isReadOnlyDetail = Boolean(isEditing && initialEvent && !vm.canModify && !vm.canInviteOthers)
  const googleSource = initialEvent?.googleSource
  const googlePeople = googleSource ? [
    { label: t('calendar.google.organizer'), person: googleSource.organizer },
    { label: t('calendar.google.creator'), person: googleSource.creator },
  ] : []

  const sharedActionModals = (
    <>
      {vm.confirmation && <RecurringConfirmationDialog confirmation={vm.confirmation} />}

      {vm.showDeleteConfirm && vm.isGoogleLinked && !pendingGoogleDeleteScope && (
        <ConfirmDeleteGoogleEventModal
          isDeleting={vm.isDeleting}
          isOpen={true}
          isReadOnly={vm.isGoogleReadOnly}
          onClose={() => {
            setPendingGoogleDeleteScope(null)
            vm.setShowDeleteConfirm(false)
          }}
          onConfirm={(scope) => {
            if (!vm.isRecurring) {
              void vm.handleDeleteEvent('all', scope)
              return
            }
            setPendingGoogleDeleteScope(scope)
          }}
          title={vm.title || (isTask ? 'nhiệm vụ' : 'sự kiện')}
        />
      )}

      {vm.showDeleteConfirm && vm.isRecurring && (!vm.isGoogleLinked || pendingGoogleDeleteScope !== null) && initialEvent && (
        <RecurrenceScopeModal
          action="delete"
          entryType={vm.entryType}
          isOpen={vm.showDeleteConfirm}
          isSubmitting={vm.isDeleting}
          onCancel={() => {
            setPendingGoogleDeleteScope(null)
            vm.setShowDeleteConfirm(false)
          }}
          onConfirm={(mode) => {
            const scope = pendingGoogleDeleteScope ?? undefined
            setPendingGoogleDeleteScope(null)
            void vm.handleDeleteEvent(mode, scope)
          }}
          targetDate={props.initialDate ?? new Date(initialEvent.startDate)}
          title={vm.title}
        />
      )}

      {vm.showDeleteConfirm && !vm.isRecurring && !vm.isGoogleLinked && (
        <div
          aria-modal="true"
          className="fixed inset-0 z-70 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-2xs"
          role="dialog"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl dark:border-white/10 dark:bg-[#021024] space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                <Icon className="size-5" name="trash" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {`Xóa ${isTask ? 'nhiệm vụ' : 'sự kiện'} này?`}
                </h4>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {`Bạn có chắc chắn muốn xóa "${vm.title || (isTask ? 'nhiệm vụ' : 'sự kiện')}" không? Thao tác này sẽ xóa vĩnh viễn và không thể hoàn tác.`}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-white/10">
              <button
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 transition-colors"
                disabled={vm.isDeleting}
                onClick={() => vm.setShowDeleteConfirm(false)}
                type="button"
              >
                Hủy
              </button>
              <button
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50 transition-colors"
                disabled={vm.isDeleting}
                onClick={() => void vm.handleDeleteEvent('all')}
                type="button"
              >
                {vm.isDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {vm.showLeaveConfirm && (
        <div
          aria-modal="true"
          className="fixed inset-0 z-70 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-2xs"
          role="dialog"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl dark:border-white/10 dark:bg-[#021024] space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                <Icon className="size-5" name="close" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {vm.isRecurring ? 'Rời khỏi cả chuỗi lặp?' : 'Rời khỏi mục này?'}
                </h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {vm.isRecurring ? 'Bạn sẽ rời tất cả các lần của' : 'Bạn sẽ rời'} {isTask ? 'nhiệm vụ' : 'sự kiện'} <strong>“{vm.title}”</strong>. Người tạo sẽ nhận được thông báo.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-white/10">
              <button
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 transition-colors"
                disabled={vm.isDeleting}
                onClick={() => vm.setShowLeaveConfirm(false)}
                type="button"
              >
                Hủy
              </button>
              <button
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50 transition-colors"
                disabled={vm.isDeleting}
                onClick={() => void vm.handleConfirmLeaveEvent()}
                type="button"
              >
                {vm.isDeleting ? 'Đang rời...' : 'Xác nhận rời'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )

  if (isReadOnlyDetail && initialEvent) {
    const calendarLabel =
      googleSource?.calendarName ||
      googleSource?.accountEmail ||
      props.categories.find((c) => c.id === vm.calendarId)?.name ||
      initialEvent.calendar?.name ||
      'Lịch cá nhân'
    const resolvedTimeZone = vm.timeZone || initialEvent.timeZone || 'Asia/Ho_Chi_Minh'
    const hasChildDialogOpen = Boolean(
      vm.showDeleteConfirm ||
        vm.showLeaveConfirm ||
        vm.confirmation ||
        pendingGoogleDeleteScope,
    )

    return (
      <>
        <ReadOnlyEventDetailCard
          activeTimeZone={resolvedTimeZone}
          calendarLabel={calendarLabel}
          canRemove={Boolean(vm.isOwner)}
          canSeeGuestList={vm.canSeeGuestList}
          color={vm.activeColor}
          event={initialEvent}
          guests={vm.guests}
          guestStatus={vm.guestStatus}
          hasChildDialogOpen={hasChildDialogOpen}
          isDeleting={vm.isDeleting}
          isGuest={vm.isGuest}
          isSubmitting={vm.isSubmitting}
          onClose={onClose}
          onRequestDelete={() => vm.setShowDeleteConfirm(true)}
          onRequestLeave={() => vm.setShowLeaveConfirm(true)}
          onRespondInvite={(status) => void vm.handleRespondInvite(status)}
          recurrenceLabel={vm.recurrenceFreq !== 'none' ? vm.getRecurrenceLabel() : undefined}
          removeLabel={vm.isGoogleLinked ? 'Xóa khỏi EduTrack' : 'Xóa sự kiện'}
        />
        {sharedActionModals}
      </>
    )
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-2xs transition-opacity sm:p-6"
      role="dialog"
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200/80 bg-white shadow-2xl dark:border-white/10 dark:bg-[#021024]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-3.5 dark:border-white/10">
          <div className="flex items-center gap-2">
            <button
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${!isTask
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                } ${!vm.canModify || (isEditing && isTask) ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!vm.canModify || (isEditing && isTask)}
              onClick={() => vm.handleTabChange('event')}
              type="button"
            >
              <Icon className="size-3.5" name="calendar" />
              <span>Sự kiện</span>
            </button>
            <button
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${isTask
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                } ${!vm.canModify || (isEditing && !isTask) ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!vm.canModify || (isEditing && !isTask)}
              onClick={() => vm.handleTabChange('task')}
              type="button"
            >
              <Icon className="size-3.5" name="clock" />
              <span>Nhiệm vụ & Deadline</span>
            </button>
          </div>

          <button
            aria-label="Đóng"
            className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white transition-colors"
            onClick={onClose}
            type="button"
          >
            <Icon className="size-4.5" name="close" />
          </button>
        </div>

        <form className="gcal-scrollbar flex-1 space-y-4 overflow-y-auto p-4 sm:p-6" noValidate onSubmit={vm.handleSubmit}>
          {vm.isGoogleReadOnly && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-200">
              Sự kiện từ Google Calendar đang ở chế độ <strong>chỉ xem</strong> (read-only). Bạn không thể chỉnh sửa nội dung; nếu muốn ẩn khỏi EduTrack, chọn Xóa để gỡ bản sao cục bộ.
            </div>
          )}

          {vm.generalError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300">
              {vm.generalError}
            </div>
          )}

          {vm.isGuest && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50/70 p-3.5 dark:border-blue-900/40 dark:bg-blue-950/30">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-blue-600 text-white">
                  <Icon className="size-4" name="account" />
                </span>
                <div>
                  <p className="text-xs font-bold text-blue-950 dark:text-blue-100">
                    Bạn là khách mời của sự kiện này
                  </p>
                  <p className="text-[11px] text-blue-700 dark:text-blue-300">
                    Trạng thái:{' '}
                    <span className="font-extrabold">
                      {vm.guestStatus === 'accepted'
                        ? 'Đã tham gia'
                        : vm.guestStatus === 'declined'
                          ? 'Đã từ chối'
                          : 'Chờ bạn phản hồi'}
                    </span>
                    {!vm.canModify && ' • Chế độ chỉ xem'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                {vm.guestStatus === 'pending' && (
                  <>
                    <button
                      className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs transition-colors hover:bg-blue-700 active:scale-95 disabled:opacity-50"
                      disabled={vm.isSubmitting}
                      onClick={() => void vm.handleRespondInvite('accepted')}
                      type="button"
                    >
                      Tham gia
                    </button>
                    <button
                      className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:bg-slate-100 active:scale-95 dark:border-white/10 dark:bg-white/10 dark:text-slate-200 disabled:opacity-50"
                      disabled={vm.isSubmitting}
                      onClick={() => void vm.handleRespondInvite('declined')}
                      type="button"
                    >
                      Từ chối
                    </button>
                  </>
                )}

                {vm.guestStatus === 'accepted' && (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                      ✓ Đã tham gia
                    </span>
                    <button
                      className="rounded-xl border border-rose-300 bg-white px-3 py-1 text-xs font-semibold text-rose-600 shadow-2xs transition-colors hover:bg-rose-50 active:scale-95 dark:border-rose-900/40 dark:bg-white/10 dark:text-rose-400"
                      disabled={vm.isDeleting}
                      onClick={() => vm.setShowLeaveConfirm(true)}
                      type="button"
                    >
                      Rời sự kiện
                    </button>
                  </div>
                )}

                {vm.guestStatus === 'declined' && (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-xl bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                      ✕ Đã từ chối
                    </span>
                    <button
                      className="rounded-xl bg-blue-600 px-3 py-1 text-xs font-bold text-white shadow-2xs transition-colors hover:bg-blue-700 active:scale-95 disabled:opacity-50"
                      disabled={vm.isSubmitting}
                      onClick={() => void vm.handleRespondInvite('accepted')}
                      type="button"
                    >
                      Tham gia lại
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <input
              ref={titleInputRef}
              aria-describedby={vm.errors.title ? 'title-error' : undefined}
              aria-invalid={Boolean(vm.errors.title)}
              className="w-full border-0 border-b border-slate-200 pb-2 text-xl font-bold text-slate-900 placeholder:text-slate-400 focus:border-slate-400 dark:border-white/15 dark:focus:border-white/30 dark:text-white disabled:opacity-75 disabled:cursor-not-allowed outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 shadow-none transition-colors"
              style={{ outline: 'none', boxShadow: 'none' }}
              disabled={!vm.canModify}
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

          {!isTask ? (
            <div className="space-y-4">
              <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-white/5 dark:bg-white/5">
                <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Thời gian diễn ra
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white p-2.5 sm:p-3 dark:border-white/10 dark:bg-white/5 space-y-1.5 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Bắt đầu
                    </span>
                    <div className="flex items-center gap-1.5">
                      <input
                        aria-label="Ngày bắt đầu"
                        className="flex-1 min-w-0 rounded-lg border border-slate-200 bg-slate-50/70 px-2 py-1.5 text-xs font-semibold text-slate-800 outline-hidden transition-all focus:border-blue-600 focus:bg-white dark:border-white/10 dark:bg-white/10 dark:text-white disabled:opacity-75 disabled:cursor-not-allowed"
                        disabled={!vm.canModify}
                        onChange={(e) => vm.setStartDate(e.target.value)}
                        type="date"
                        value={vm.startDate}
                      />
                      {!vm.isAllDay && (
                        <input
                          aria-label="Giờ bắt đầu"
                          className="w-[102px] shrink-0 rounded-lg border border-slate-200 bg-slate-50/70 px-1.5 py-1.5 text-xs font-bold text-slate-800 outline-hidden transition-all focus:border-blue-600 focus:bg-white dark:border-white/10 dark:bg-white/10 dark:text-white disabled:opacity-75 disabled:cursor-not-allowed"
                          disabled={!vm.canModify}
                          onChange={(e) => vm.setStartTime(e.target.value)}
                          type="time"
                          value={vm.startTime}
                        />
                      )}
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white p-2.5 sm:p-3 dark:border-white/10 dark:bg-white/5 space-y-1.5 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Kết thúc
                    </span>
                    <div className="flex items-center gap-1.5">
                      <input
                        aria-label="Ngày kết thúc"
                        className="flex-1 min-w-0 rounded-lg border border-slate-200 bg-slate-50/70 px-2 py-1.5 text-xs font-semibold text-slate-800 outline-hidden transition-all focus:border-blue-600 focus:bg-white dark:border-white/10 dark:bg-white/10 dark:text-white disabled:opacity-75 disabled:cursor-not-allowed"
                        disabled={!vm.canModify}
                        onChange={(e) => vm.setEndDate(e.target.value)}
                        type="date"
                        value={vm.endDate}
                      />
                      {!vm.isAllDay && (
                        <input
                          aria-label="Giờ kết thúc"
                          className="w-[102px] shrink-0 rounded-lg border border-slate-200 bg-slate-50/70 px-1.5 py-1.5 text-xs font-bold text-slate-800 outline-hidden transition-all focus:border-blue-600 focus:bg-white dark:border-white/10 dark:bg-white/10 dark:text-white disabled:opacity-75 disabled:cursor-not-allowed"
                          disabled={!vm.canModify}
                          onChange={(e) => vm.setEndTime(e.target.value)}
                          type="time"
                          value={vm.endTime}
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-white/5">
                  <label className="flex cursor-pointer items-center gap-2 select-none" htmlFor="event-is-allday">
                    <input
                      checked={vm.isAllDay}
                      className="size-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-75 disabled:cursor-not-allowed"
                      disabled={!vm.canModify}
                      id="event-is-allday"
                      onChange={(e) => vm.setIsAllDay(e.target.checked)}
                      type="checkbox"
                    />
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Cả ngày</span>
                  </label>

                  <div className="flex items-center gap-1.5 text-xs">
                    <select
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-hidden dark:border-white/10 dark:bg-white/5 dark:text-white disabled:opacity-75 disabled:cursor-not-allowed"
                      disabled={!vm.canModify}
                      onChange={(e) => vm.handleSelectRecurrence(e.target.value as RecurrenceFrequency)}
                      aria-invalid={Boolean(vm.errors.recurrence)}
                      aria-describedby={vm.errors.recurrence ? 'event-recurrence-error' : undefined}
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

                    {vm.errors.recurrence && (
                      <p id="event-recurrence-error" className="mt-1 text-xs text-red-600">{vm.errors.recurrence}</p>
                    )}
                    {vm.recurrenceFreq === 'custom' && (
                      <button
                        className="flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 disabled:opacity-75 disabled:cursor-not-allowed"
                        disabled={!vm.canModify}
                        onClick={() => vm.setIsCustomRecurrenceOpen(true)}
                        title="Chỉnh sửa cấu hình lặp lại"
                        type="button"
                      >
                        <Icon className="size-3" name="edit" />
                        <span>{vm.getRecurrenceLabel()}</span>
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

              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="grid size-8 shrink-0 place-items-center text-slate-400">
                    <Icon className="size-4.5" name="link" />
                  </span>
                  <input
                    aria-describedby={vm.errors.onlineMeetingUrl ? 'online-meeting-url-error' : undefined}
                    aria-invalid={Boolean(vm.errors.onlineMeetingUrl)}
                    className={`w-full rounded-xl border bg-slate-50/70 px-3 py-2 text-xs text-slate-800 outline-hidden transition-all focus:bg-white dark:bg-white/5 dark:text-white disabled:opacity-75 disabled:cursor-not-allowed ${
                      vm.errors.onlineMeetingUrl
                        ? 'border-rose-500 focus:border-rose-500'
                        : 'border-slate-200 focus:border-blue-600 dark:border-white/10'
                    }`}
                    disabled={!vm.canModify}
                    onChange={(e) => vm.setOnlineMeetingUrl(e.target.value)}
                    placeholder="Thêm hội nghị truyền hình trên Google Meet, Zoom..."
                    type="url"
                    value={vm.onlineMeetingUrl}
                  />
                </div>
                {vm.errors.onlineMeetingUrl && (
                  <p className="pl-11 text-xs font-semibold text-rose-500" id="online-meeting-url-error">
                    {vm.errors.onlineMeetingUrl}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="grid size-8 shrink-0 place-items-center text-slate-400">
                    <Icon className="size-4.5" name="mapPin" />
                  </span>
                  <input
                    aria-describedby={vm.errors.location ? 'location-error' : undefined}
                    aria-invalid={Boolean(vm.errors.location)}
                    className={`w-full rounded-xl border bg-slate-50/70 px-3 py-2 text-xs text-slate-800 outline-hidden transition-all focus:bg-white dark:bg-white/5 dark:text-white disabled:opacity-75 disabled:cursor-not-allowed ${
                      vm.errors.location
                        ? 'border-rose-500 focus:border-rose-500'
                        : 'border-slate-200 focus:border-blue-600 dark:border-white/10'
                    }`}
                    disabled={!vm.canModify}
                    onChange={(e) => vm.setLocation(e.target.value)}
                    placeholder="Thêm vị trí, phòng học..."
                    type="text"
                    value={vm.location}
                  />
                </div>
                {vm.errors.location && (
                  <p className="pl-11 text-xs font-semibold text-rose-500" id="location-error">
                    {vm.errors.location}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-white/5 dark:bg-white/5">
                <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Thời gian thực hiện
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white p-2.5 sm:p-3 dark:border-white/10 dark:bg-white/5 space-y-1.5 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Bắt đầu
                    </span>
                    <div className="flex items-center gap-1.5">
                      <input
                        aria-label="Ngày bắt đầu nhiệm vụ"
                        className="flex-1 min-w-0 rounded-lg border border-slate-200 bg-slate-50/70 px-2 py-1.5 text-xs font-semibold text-slate-800 outline-hidden transition-all focus:border-blue-600 focus:bg-white dark:border-white/10 dark:bg-white/10 dark:text-white disabled:opacity-75 disabled:cursor-not-allowed"
                        disabled={!vm.canModify}
                        onChange={(e) => vm.setStartDate(e.target.value)}
                        type="date"
                        value={vm.startDate}
                      />
                      {!vm.isAllDay && (
                        <input
                          aria-label="Giờ bắt đầu nhiệm vụ"
                          className="w-[102px] shrink-0 rounded-lg border border-slate-200 bg-slate-50/70 px-1.5 py-1.5 text-xs font-bold text-slate-800 outline-hidden transition-all focus:border-blue-600 focus:bg-white dark:border-white/10 dark:bg-white/10 dark:text-white disabled:opacity-75 disabled:cursor-not-allowed"
                          disabled={!vm.canModify}
                          onChange={(e) => vm.setStartTime(e.target.value)}
                          type="time"
                          value={vm.startTime}
                        />
                      )}
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white p-2.5 sm:p-3 dark:border-white/10 dark:bg-white/5 space-y-1.5 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Kết thúc
                    </span>
                    <div className="flex items-center gap-1.5">
                      <input
                        aria-label="Ngày kết thúc nhiệm vụ"
                        className="flex-1 min-w-0 rounded-lg border border-slate-200 bg-slate-50/70 px-2 py-1.5 text-xs font-semibold text-slate-800 outline-hidden transition-all focus:border-blue-600 focus:bg-white dark:border-white/10 dark:bg-white/10 dark:text-white disabled:opacity-75 disabled:cursor-not-allowed"
                        disabled={!vm.canModify}
                        onChange={(e) => vm.setEndDate(e.target.value)}
                        type="date"
                        value={vm.endDate}
                      />
                      {!vm.isAllDay && (
                        <input
                          aria-label="Giờ kết thúc nhiệm vụ"
                          className="w-[102px] shrink-0 rounded-lg border border-slate-200 bg-slate-50/70 px-1.5 py-1.5 text-xs font-bold text-slate-800 outline-hidden transition-all focus:border-blue-600 focus:bg-white dark:border-white/10 dark:bg-white/10 dark:text-white disabled:opacity-75 disabled:cursor-not-allowed"
                          disabled={!vm.canModify}
                          onChange={(e) => vm.setEndTime(e.target.value)}
                          type="time"
                          value={vm.endTime}
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-white/5">
                  <label className="flex cursor-pointer items-center gap-2 select-none" htmlFor="task-is-allday">
                    <input
                      checked={vm.isAllDay}
                      className="size-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-75 disabled:cursor-not-allowed"
                      disabled={!vm.canModify}
                      id="task-is-allday"
                      onChange={(e) => vm.setIsAllDay(e.target.checked)}
                      type="checkbox"
                    />
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Cả ngày</span>
                  </label>

                  <div className="flex items-center gap-1.5 text-xs">
                    <select
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-hidden dark:border-white/10 dark:bg-white/5 dark:text-white disabled:opacity-75 disabled:cursor-not-allowed"
                      disabled={!vm.canModify}
                      onChange={(e) => vm.handleSelectRecurrence(e.target.value as RecurrenceFrequency)}
                      aria-invalid={Boolean(vm.errors.recurrence)}
                      aria-describedby={vm.errors.recurrence ? 'task-recurrence-error' : undefined}
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

                    {vm.errors.recurrence && (
                      <p id="task-recurrence-error" className="mt-1 text-xs text-red-600">{vm.errors.recurrence}</p>
                    )}
                    {vm.recurrenceFreq === 'custom' && (
                      <button
                        className="flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 disabled:opacity-75 disabled:cursor-not-allowed"
                        disabled={!vm.canModify}
                        onClick={() => vm.setIsCustomRecurrenceOpen(true)}
                        title="Chỉnh sửa cấu hình lặp lại"
                        type="button"
                      >
                        <Icon className="size-3" name="edit" />
                        <span>{vm.getRecurrenceLabel()}</span>
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

              {vm.recurrenceFreq !== 'none' ? (
                <p className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-[11px] italic text-slate-500 dark:border-white/5 dark:bg-white/5 dark:text-slate-400">
                  Việc cần làm định kỳ không được có thời hạn. Chọn &quot;Không lặp lại&quot; để đặt thời hạn.
                </p>
              ) : (
              <div className="space-y-2.5 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-white/5 dark:bg-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Hạn chót hoàn thành (Deadline)
                    </span>
                    {vm.hasDeadline && (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                        Có deadline
                      </span>
                    )}
                  </div>

                  <label className="flex cursor-pointer items-center gap-1.5 select-none" htmlFor="toggle-has-deadline">
                    <input
                      checked={vm.hasDeadline}
                      className="size-3.5 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-75 disabled:cursor-not-allowed"
                      disabled={!vm.canModify}
                      id="toggle-has-deadline"
                      onChange={(e) => vm.setHasDeadline(e.target.checked)}
                      type="checkbox"
                    />
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Đặt hạn chót</span>
                  </label>
                </div>

                {vm.hasDeadline ? (
                  <div className="flex items-center gap-2 text-xs">
                    <input
                      aria-label="Ngày hạn chót"
                      className="flex-1 min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-800 outline-hidden focus:border-blue-600 dark:border-white/10 dark:bg-white/5 dark:text-white disabled:opacity-75 disabled:cursor-not-allowed"
                      disabled={!vm.canModify}
                      onChange={(e) => vm.setDeadlineDate(e.target.value)}
                      type="date"
                      value={vm.deadlineDate}
                    />

                    {!vm.isAllDay && (
                      <input
                        aria-label="Giờ hạn chót"
                        className="w-[102px] shrink-0 rounded-lg border border-slate-200 bg-white px-1.5 py-1.5 font-bold text-slate-800 outline-hidden focus:border-blue-600 dark:border-white/10 dark:bg-white/5 dark:text-white disabled:opacity-75 disabled:cursor-not-allowed"
                        disabled={!vm.canModify}
                        onChange={(e) => vm.setDeadlineTime(e.target.value)}
                        type="time"
                        value={vm.deadlineTime}
                      />
                    )}

                    {vm.canModify && (
                      <button
                        aria-label="Hủy hạn chót"
                        className="grid size-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
                        onClick={() => vm.setHasDeadline(false)}
                        title="Bỏ hạn chót"
                        type="button"
                      >
                        <Icon className="size-3.5" name="close" />
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                    Chưa đặt hạn chót riêng cho nhiệm vụ này (áp dụng theo thời gian kết thúc ở trên).
                  </p>
                )}
                {vm.errors.deadline && (
                  <p className="text-xs font-semibold text-rose-500">{vm.errors.deadline}</p>
                )}
              </div>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Mức độ ưu tiên
                  </span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    Màu sắc & thông báo tự động theo mức
                  </span>
                </div>
                <div className="mt-1.5 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PRIORITY_ITEMS.map((item) => {
                    const isSelected = vm.priority === item.value
                    return (
                      <button
                        className={`flex items-center justify-center gap-2 rounded-xl border py-2 px-2 text-xs font-bold transition-all ${isSelected
                          ? 'border-blue-600 bg-blue-50/70 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 ring-2 ring-blue-600/30'
                          : 'border-slate-200 bg-white/70 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300'
                          } ${!vm.canModify ? 'opacity-70 cursor-not-allowed' : ''}`}
                        disabled={!vm.canModify}
                        key={item.value}
                        onClick={() => vm.handleSelectPriority(item.value)}
                        type="button"
                      >
                        <span className={`size-2.5 rounded-full ${item.dotColor}`} />
                        <span>{item.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-white/5 dark:bg-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Trạng thái & Tiến độ
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        vm.isCompleted
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                      }`}
                    >
                      {vm.isCompleted ? '✓ Đã hoàn thành' : 'Đang thực hiện'}
                    </span>
                  </div>

                  <label
                    className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 select-none transition-colors ${
                      vm.isCompleted
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'
                        : 'border-slate-200 bg-white hover:border-emerald-500 dark:border-white/10 dark:bg-white/5'
                    } ${!vm.canModify ? 'cursor-not-allowed opacity-70' : ''}`}
                    htmlFor="toggle-task-complete"
                  >
                    <input
                      checked={vm.isCompleted}
                      className="size-4 rounded-sm border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:cursor-not-allowed"
                      disabled={!vm.canModify}
                      id="toggle-task-complete"
                      onChange={() => {
                        if (!vm.handleToggleComplete()) titleInputRef.current?.focus()
                      }}
                      type="checkbox"
                    />
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Đã hoàn thành</span>
                  </label>
                </div>

                {vm.checklistTotalCount > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      <span>Tiến độ checklist ({vm.checklistCompletedCount}/{vm.checklistTotalCount} bước)</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{vm.checklistProgressPercent}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                      <div
                        className={`h-full transition-all duration-300 ${
                          vm.checklistProgressPercent === 100
                            ? 'bg-emerald-500'
                            : 'bg-[#548383]'
                        }`}
                        style={{ width: `${vm.checklistProgressPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2 pt-1 border-t border-slate-200/60 dark:border-white/5">
                  <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Các bước cần làm (Checklist)
                  </span>
                  {vm.errors.checklist && (
                    <p className="text-xs font-semibold text-rose-500">{vm.errors.checklist}</p>
                  )}

                  {vm.checklist.length > 0 && (
                    <div className="space-y-1.5">
                      {vm.checklist.map((item) => (
                        <div className="flex items-center justify-between gap-2 rounded-lg bg-white p-2 shadow-2xs dark:bg-white/5" key={item.id}>
                          <label className="flex flex-1 cursor-pointer items-center gap-2 select-none" htmlFor={`check-${item.id}`}>
                            <input
                              checked={item.isCompleted}
                              className="size-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-75 disabled:cursor-not-allowed"
                              disabled={!vm.canModify}
                              id={`check-${item.id}`}
                              onChange={() => vm.handleToggleSubtask(item.id)}
                              type="checkbox"
                            />
                            <span className={`text-xs font-medium ${item.isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-white'}`}>
                              {item.title}
                            </span>
                          </label>
                          {vm.canModify && (
                            <button
                              aria-label="Xóa bước này"
                              className="text-slate-400 hover:text-rose-500"
                              onClick={() => vm.handleRemoveSubtask(item.id)}
                              type="button"
                            >
                              <Icon className="size-3.5" name="close" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {vm.canModify && (
                    <div className="flex items-center gap-2">
                      <input
                        aria-describedby={vm.errors.checklist ? 'checklist-error' : undefined}
                        aria-invalid={Boolean(vm.errors.checklist)}
                        className={`flex-1 rounded-lg border bg-white px-3 py-1.5 text-xs text-slate-800 outline-hidden transition-all dark:bg-white/5 dark:text-white ${
                          vm.errors.checklist
                            ? 'border-rose-500 focus:border-rose-500'
                            : 'border-slate-200 focus:border-blue-600 dark:border-white/10'
                        }`}
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
                        className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-300 active:scale-95 transition-all dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                        onClick={vm.handleAddSubtask}
                        type="button"
                      >
                        + Thêm
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="grid size-8 shrink-0 place-items-center text-slate-400">
                    <Icon className="size-4.5" name="link" />
                  </span>
                  <input
                    aria-describedby={vm.errors.submissionUrl ? 'submission-url-error' : undefined}
                    aria-invalid={Boolean(vm.errors.submissionUrl)}
                    className={`w-full rounded-xl border bg-slate-50/70 px-3 py-2 text-xs text-slate-800 outline-hidden transition-all focus:bg-white dark:bg-white/5 dark:text-white disabled:opacity-75 disabled:cursor-not-allowed ${
                      vm.errors.submissionUrl
                        ? 'border-rose-500 focus:border-rose-500'
                        : 'border-slate-200 focus:border-blue-600 dark:border-white/10'
                    }`}
                    disabled={!vm.canModify}
                    onChange={(e) => vm.setSubmissionUrl(e.target.value)}
                    placeholder="Link nộp bài LMS, Google Drive, GitHub repo..."
                    type="url"
                    value={vm.submissionUrl}
                  />
                </div>
                {vm.errors.submissionUrl && (
                  <p className="pl-11 text-xs font-semibold text-rose-500" id="submission-url-error">
                    {vm.errors.submissionUrl}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex items-start gap-3">
            <span className="mt-1 grid size-8 shrink-0 place-items-center text-slate-400">
              <Icon className="size-4.5" name="bell" />
            </span>
            <div className="min-w-0 flex-1 space-y-2">
              {vm.reminders.map((rem) => (
                <div className="flex flex-wrap items-center gap-2" key={rem.id}>
                  <select
                    className="rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-hidden disabled:opacity-75 disabled:cursor-not-allowed dark:border-white/10 dark:bg-white/5 dark:text-white"
                    disabled={!vm.canModify}
                    onChange={(e) => vm.handleUpdateReminder(rem.id, 'method', e.target.value as ReminderMethod)}
                    value={rem.method}
                  >
                    <option value="in-app">Thông báo</option>
                    <option value="email">Email</option>
                  </select>

                  <input
                    className="w-16 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-hidden disabled:opacity-75 disabled:cursor-not-allowed dark:border-white/10 dark:bg-white/5 dark:text-white"
                    disabled={!vm.canModify}
                    max={999}
                    min={1}
                    onChange={(e) => vm.handleUpdateReminder(rem.id, 'quantity', Math.max(1, Number(e.target.value) || 1))}
                    type="number"
                    value={rem.quantity}
                  />

                  <select
                    className="rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-hidden disabled:opacity-75 disabled:cursor-not-allowed dark:border-white/10 dark:bg-white/5 dark:text-white"
                    disabled={!vm.canModify}
                    onChange={(e) => vm.handleUpdateReminder(rem.id, 'unit', e.target.value as ReminderUnit)}
                    value={rem.unit}
                  >
                    <option value="minutes">phút</option>
                    <option value="hours">giờ</option>
                    <option value="days">ngày</option>
                    <option value="weeks">tuần</option>
                  </select>

                  {vm.canModify && (
                    <button
                      aria-label="Xóa thông báo"
                      className="grid size-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
                      onClick={() => vm.handleRemoveReminder(rem.id)}
                      type="button"
                    >
                      <Icon className="size-3.5" name="close" />
                    </button>
                  )}
                </div>
              ))}

              {vm.canModify && (
                <button
                  className="text-xs font-bold text-blue-600 hover:underline dark:text-blue-400"
                  onClick={vm.handleAddReminder}
                  type="button"
                >
                  + Thêm thông báo
                </button>
              )}
              {vm.errors.reminders && (
                <p className="text-xs font-semibold text-rose-500">{vm.errors.reminders}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5 border-t border-slate-100 pt-3 dark:border-white/10">
            <div className="flex items-center gap-3">
              <span className="grid size-8 shrink-0 place-items-center text-slate-400">
                <Icon className="size-4.5" name="calendar" />
              </span>
              <div className="relative flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:flex-nowrap">
                {googleSource && (
                  <div
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold dark:border-white/10"
                    title={googleSource.calendarName ? `${googleSource.accountEmail} — ${googleSource.calendarName}` : googleSource.accountEmail}
                  >
                    <img alt="" className="size-4 shrink-0" src="/google-g-logo.png" />
                    <span className="truncate" title={googleSource.accountEmail}>{googleSource.accountEmail}</span>
                    <span
                      aria-hidden="true"
                      className="size-3 shrink-0 rounded-full"
                      style={{ backgroundColor: googleSource.calendarColor || initialEvent?.color }}
                    />
                  </div>
                )}
                {!isTask && !googleSource && (() => {
                  const selectedCat =
                    vm.editableCategories.find((cat) => cat.id === vm.calendarId) ??
                    (initialEvent?.calendar && initialEvent.calendar.id === vm.calendarId
                      ? initialEvent.calendar
                      : undefined)
                  const tzShort = selectedCat?.settings?.timeZone
                    ? selectedCat.settings.timeZone.split('/')[1] || selectedCat.settings.timeZone
                    : ''
                  const isCreatorCalOnly =
                    Boolean(initialEvent?.calendar) &&
                    !vm.editableCategories.some((cat) => cat.id === initialEvent?.calendar?.id)

                  return (
                    <div className="relative flex-1 min-w-0" ref={calendarDropdownRef}>
                      <button
                        aria-expanded={isCalendarDropdownOpen}
                        aria-haspopup="listbox"
                        className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-left text-xs transition-all hover:bg-white focus:border-blue-600 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 disabled:opacity-75 disabled:cursor-not-allowed"
                        disabled={!vm.canModify}
                        onClick={() => setIsCalendarDropdownOpen((prev) => !prev)}
                        type="button"
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          <span
                            className="h-4 w-1 shrink-0 rounded-full"
                            style={{ backgroundColor: selectedCat?.color || '#2563EB' }}
                          />
                          <span className="truncate font-semibold text-slate-800 dark:text-white">
                            {selectedCat?.name || 'Chọn lịch'}
                          </span>
                          {tzShort && (
                            <span className="hidden sm:inline-block shrink-0 rounded-md bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
                              {tzShort}
                            </span>
                          )}
                          {selectedCat?.isShared && (
                            <span className="shrink-0 rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                              Chia sẻ
                            </span>
                          )}
                        </span>
                        <Icon
                          className={`size-3.5 shrink-0 text-slate-400 transition-transform ${
                            isCalendarDropdownOpen ? 'rotate-180' : ''
                          }`}
                          name="chevronDown"
                        />
                      </button>

                      {isCalendarDropdownOpen && vm.canModify && (
                        <div
                          className="absolute left-0 right-0 bottom-full z-30 mb-1.5 max-h-56 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-white/10 dark:bg-[#021024]"
                          role="listbox"
                        >
                          {isCreatorCalOnly && initialEvent?.calendar && (
                            <button
                              className={`flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-xs transition ${
                                vm.calendarId === initialEvent.calendar.id
                                  ? 'bg-blue-50/80 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200'
                                  : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/10'
                              }`}
                              onClick={() => {
                                vm.handleCalendarSelect(initialEvent.calendar!.id)
                                setIsCalendarDropdownOpen(false)
                              }}
                              role="option"
                              aria-selected={vm.calendarId === initialEvent.calendar.id}
                              type="button"
                            >
                              <span className="flex min-w-0 items-center gap-2.5">
                                <span
                                  className="h-4 w-1 shrink-0 rounded-full"
                                  style={{ backgroundColor: initialEvent.calendar.color || '#2563EB' }}
                                />
                                <span className="truncate font-semibold">
                                  {initialEvent.calendar.name} (Lịch người tạo)
                                </span>
                              </span>
                              {vm.calendarId === initialEvent.calendar.id && (
                                <Icon className="size-3.5 shrink-0 text-blue-600 dark:text-blue-400" name="check" />
                              )}
                            </button>
                          )}

                          {vm.editableCategories.map((cat) => {
                            const isSelected = vm.calendarId === cat.id
                            const catTz = cat.settings?.timeZone
                              ? cat.settings.timeZone.split('/')[1] || cat.settings.timeZone
                              : ''
                            return (
                              <button
                                aria-selected={isSelected}
                                className={`flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-xs transition ${
                                  isSelected
                                    ? 'bg-blue-50/80 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200'
                                    : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/10'
                                }`}
                                key={cat.id}
                                onClick={() => {
                                  vm.handleCalendarSelect(cat.id)
                                  setIsCalendarDropdownOpen(false)
                                }}
                                role="option"
                                type="button"
                              >
                                <span className="flex min-w-0 items-center gap-2.5">
                                  <span
                                    className="h-4 w-1 shrink-0 rounded-full"
                                    style={{ backgroundColor: cat.color || '#2563EB' }}
                                  />
                                  <span className="truncate font-semibold">{cat.name}</span>
                                  {catTz && (
                                    <span className="shrink-0 text-[10px] text-slate-400">
                                      {catTz}
                                    </span>
                                  )}
                                  {cat.isShared && (
                                    <span className="shrink-0 rounded bg-blue-100/80 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                                      Chia sẻ
                                    </span>
                                  )}
                                </span>
                                {isSelected && (
                                  <Icon className="size-3.5 shrink-0 text-blue-600 dark:text-blue-400" name="check" />
                                )}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })()}
                {isTask && (
                  <span className="flex-1 text-xs font-semibold text-slate-600 dark:text-slate-300">Màu thẻ nhiệm vụ</span>
                )}

                <div className="relative">
                  <button
                    aria-label="Chọn màu thẻ"
                    className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-2 text-xs transition-all hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 disabled:opacity-75 disabled:cursor-not-allowed"
                    disabled={!vm.canModify}
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

                  {vm.isColorPickerOpen && (
                    <div
                      className="gcal-scrollbar absolute right-0 bottom-full z-30 mb-2 max-h-64 w-60 max-w-[calc(100vw-3rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-white/10 dark:bg-[#021024]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between pb-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        <span>Màu sắc thẻ</span>
                        <button
                          aria-pressed={!vm.color}
                          className="text-blue-600 hover:underline aria-pressed:underline dark:text-blue-400"
                          onClick={() => {
                            vm.setColor('')
                            vm.setIsColorPickerOpen(false)
                          }}
                          type="button"
                        >
                          {isTask ? 'Theo mức ưu tiên' : 'Theo màu lịch'}
                        </button>
                      </div>
                      <div className="grid grid-cols-6 gap-2">
                        {UNIFIED_EVENT_COLORS.map((item) => {
                          const isSelected = vm.color.toLowerCase() === item.hex.toLowerCase()
                          return (
                            <button
                              aria-label={item.label ? `Chọn màu ${item.label} (${item.hex})` : `Chọn màu ${item.hex}`}
                              aria-pressed={isSelected}
                              className={`size-6 rounded-full transition-transform hover:scale-110 ${isSelected ? 'ring-2 ring-blue-600 ring-offset-2' : ''
                                }`}
                              key={item.hex}
                              onClick={() => {
                                vm.setColor(item.hex)
                                vm.setIsColorPickerOpen(false)
                              }}
                              style={{ backgroundColor: item.hex }}
                              title={item.label || item.hex}
                              type="button"
                            />
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {onOpenCreateCategory && vm.canModify && !isTask && !googleSource && (
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
            <div className="flex min-w-0 items-center gap-2 pl-0 sm:pl-11 text-xs">
              <span className="text-slate-500 shrink-0 font-medium dark:text-slate-400">
                Múi giờ:
              </span>
              <select
                aria-label="Múi giờ sự kiện"
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-hidden transition-all focus:border-blue-600 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white disabled:opacity-75 disabled:cursor-not-allowed"
                disabled={!vm.canModify}
                onChange={(e) => vm.handleTimeZoneChange(e.target.value)}
                value={vm.timeZone}
              >
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
                {!COMMON_TIMEZONES.some((tz) => tz.value === vm.timeZone) && vm.timeZone && (
                  <option value={vm.timeZone}>{vm.timeZone}</option>
                )}
              </select>
            </div>
          </div>

          <div className="space-y-2 border-t border-slate-100 pt-3 dark:border-white/10">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center text-slate-400">
                <Icon className="size-4.5" name="account" />
              </span>
              <div className="min-w-0 flex-1 space-y-2">
                {googlePeople.map(({ label, person }) => (
                  person?.email || person?.displayName ? (
                    <div className="flex flex-wrap items-baseline gap-1.5 text-xs text-slate-500 dark:text-slate-400" key={label}>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{label}:</span>
                      <span className="break-all font-medium text-blue-600 dark:text-blue-400">
                        {person.displayName || person.email}
                      </span>
                      {person.displayName && person.email && person.displayName !== person.email && (
                        <span className="break-all">({person.email})</span>
                      )}
                    </div>
                  ) : null
                ))}
                {!googleSource && vm.creatorEmail && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Người tạo:</span>
                    <span className="font-medium text-blue-600 dark:text-blue-400">{vm.creatorEmail}</span>
                  </div>
                )}
                {vm.canInviteOthers ? (
                  <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                    <input
                      aria-describedby={vm.guestEmailError ? 'guest-email-error' : undefined}
                      aria-invalid={Boolean(vm.guestEmailError)}
                      className={`min-w-0 flex-1 rounded-xl border bg-slate-50/70 px-3 py-1.5 text-xs text-slate-800 outline-hidden transition-all focus:bg-white dark:bg-white/5 dark:text-white ${
                        vm.guestEmailError
                          ? 'border-rose-500 focus:border-rose-500'
                          : 'border-slate-200 focus:border-blue-600 dark:border-white/10'
                      }`}
                      onChange={(e) => vm.setNewGuestEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          void vm.handleAddGuest()
                        }
                      }}
                      placeholder="Thêm khách mời (nhập email hoặc username)..."
                      type="text"
                      value={vm.newGuestEmail}
                    />
                    <button
                      className="shrink-0 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition-colors hover:bg-blue-700 active:scale-95 disabled:opacity-60"
                      disabled={vm.isResolvingGuest}
                      onClick={() => void vm.handleAddGuest()}
                      type="button"
                    >
                      {vm.isResolvingGuest ? 'Đang kiểm tra...' : '+ Mời'}
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    Người tạo sự kiện không cho phép khách mời mời thêm người khác.
                  </p>
                )}
                {!isTask && vm.selectedCategorySharedCount > 0 && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Lịch cha đang chia sẻ với {vm.selectedCategorySharedCount} thành viên (tách biệt với danh sách khách mời riêng của sự kiện).
                  </p>
                )}
                {vm.guestEmailError && (
                  <p className="text-xs font-semibold text-rose-500" id="guest-email-error">{vm.guestEmailError}</p>
                )}

                {vm.canManageGuests && (
                  <div className="space-y-1">
                    <span className="block text-[11px] font-semibold text-slate-400">
                      Quyền khách mời (chỉ áp dụng riêng cho sự kiện này):
                    </span>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <label className="flex cursor-pointer items-center gap-1.5 select-none">
                      <input
                        checked={vm.guestCanModify}
                        className="size-3.5 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
                        onChange={(e) => vm.handleToggleAllGuestCanModify(e.target.checked)}
                        type="checkbox"
                      />
                      <span>Khách có thể sửa sự kiện</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-1.5 select-none">
                      <input
                        checked={vm.guestCanInviteOthers}
                        className="size-3.5 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
                        onChange={(e) => vm.handleToggleAllGuestCanInviteOthers(e.target.checked)}
                        type="checkbox"
                      />
                      <span>Khách có thể mời người khác</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-1.5 select-none">
                      <input
                        checked={vm.guestCanSeeGuestList}
                        className="size-3.5 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
                        onChange={(e) => vm.handleToggleAllGuestCanSeeGuestList(e.target.checked)}
                        type="checkbox"
                      />
                      <span>Xem danh sách khách</span>
                    </label>
                    </div>
                  </div>
                )}

                {vm.isOwner && !isTask && (initialEvent?.joinRequests ?? []).filter((r) => r.status === 'pending').length > 0 && (
                  <div className="space-y-1.5 rounded-xl border border-amber-200/80 bg-amber-50/50 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                      Yêu cầu xin tham gia ({(initialEvent?.joinRequests ?? []).filter((r) => r.status === 'pending').length})
                    </span>
                    <div className="space-y-1.5">
                      {(initialEvent?.joinRequests ?? [])
                        .filter((r) => r.status === 'pending')
                        .map((req) => (
                          <div
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200/60 bg-white px-2.5 py-1.5 text-xs dark:border-white/10 dark:bg-white/5"
                            key={req.id}
                          >
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-800 dark:text-white">
                                {req.fullName || req.email}{' '}
                                <span className="font-normal text-slate-400">({req.email})</span>
                              </p>
                              {req.message && (
                                <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                                  &ldquo;{req.message}&rdquo;
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                className="rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                                disabled={handlingRequestId === req.id}
                                onClick={async () => {
                                  if (!initialEvent) return
                                  const realId =
                                    (initialEvent as unknown as { _baseEventId?: string })._baseEventId ||
                                    initialEvent.id
                                  try {
                                    setHandlingRequestId(req.id)
                                    await calendarApi.respondJoinRequest(realId, req.id, 'approved')
                                    props.onSaved()
                                  } finally {
                                    setHandlingRequestId(null)
                                  }
                                }}
                                type="button"
                              >
                                Đồng ý
                              </button>
                              <button
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                                disabled={handlingRequestId === req.id}
                                onClick={async () => {
                                  if (!initialEvent) return
                                  const realId =
                                    (initialEvent as unknown as { _baseEventId?: string })._baseEventId ||
                                    initialEvent.id
                                  try {
                                    setHandlingRequestId(req.id)
                                    await calendarApi.respondJoinRequest(realId, req.id, 'rejected')
                                    props.onSaved()
                                  } finally {
                                    setHandlingRequestId(null)
                                  }
                                }}
                                type="button"
                              >
                                Từ chối
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {vm.canSeeGuestList ? (
                  vm.guests.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {vm.guests.map((g) => (
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-white/10 dark:text-slate-200"
                          key={g.email}
                        >
                          <span>{g.email}</span>
                          {g.status === 'accepted' ? (
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              (Đã tham gia)
                            </span>
                          ) : g.status === 'declined' ? (
                            <span className="text-[10px] font-bold text-rose-500">
                              (Từ chối)
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                              (Chờ phản hồi)
                            </span>
                          )}
                          {vm.canManageGuests ? (
                            <select
                              aria-label={`Quyền của ${g.email}`}
                              className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-700 outline-hidden focus:border-blue-600 dark:border-white/10 dark:bg-white/10 dark:text-slate-200"
                              onChange={(e) =>
                                vm.handleChangeGuestPermissionLevel(
                                  g.email,
                                  e.target.value as 'viewer' | 'inviter' | 'editor',
                                )
                              }
                              value={
                                g.canModify
                                  ? 'editor'
                                  : g.canInviteOthers !== false
                                    ? 'inviter'
                                    : 'viewer'
                              }
                            >
                              <option value="viewer">Chỉ xem</option>
                              <option value="inviter">Có thể mời khách</option>
                              <option value="editor">Chỉnh sửa sự kiện</option>
                            </select>
                          ) : (
                            <span
                              className={`text-[10px] font-bold ${
                                g.canModify
                                  ? 'text-blue-600 dark:text-blue-400'
                                  : g.canInviteOthers !== false
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              •{' '}
                              {g.canModify
                                ? 'Chỉnh sửa sự kiện'
                                : g.canInviteOthers !== false
                                  ? 'Có thể mời khách'
                                  : 'Chỉ xem'}
                            </span>
                          )}
                          {vm.canManageGuests && (
                            <button
                              aria-label={`Xóa khách ${g.email}`}
                              className="ml-0.5 text-slate-400 hover:text-rose-600"
                              onClick={() => vm.handleRequestRemoveGuest(g.email)}
                              type="button"
                            >
                              <Icon className="size-3" name="close" />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  )
                ) : (
                  <p className="text-xs text-slate-400 italic">Danh sách khách mời được ẩn bởi người tạo.</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="grid size-8 shrink-0 place-items-center text-slate-400">
              <Icon className="size-4.5" name="briefcase" />
            </span>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <select
                className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs font-medium text-slate-800 outline-hidden dark:border-white/10 dark:bg-white/5 dark:text-white disabled:opacity-75 disabled:cursor-not-allowed"
                disabled={!vm.canModify}
                onChange={(e) => vm.setAvailability(e.target.value as 'busy' | 'free')}
                value={vm.availability}
              >
                <option value="busy">Bận</option>
                <option value="free">Rảnh</option>
              </select>

              <select
                className="min-w-0 max-w-full flex-1 sm:flex-initial rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs font-medium text-slate-800 outline-hidden dark:border-white/10 dark:bg-white/5 dark:text-white disabled:opacity-75 disabled:cursor-not-allowed"
                disabled={!vm.canModify}
                onChange={(e) => vm.setVisibility(e.target.value as 'default' | 'public' | 'private')}
                value={
                  isTask && vm.visibility === 'default'
                    ? 'private'
                    : !vm.isSelectedCategoryPublic && vm.visibility === 'public'
                      ? 'default'
                      : vm.visibility
                }
              >
                {!isTask && (
                  <option value="default">
                    {vm.isSelectedCategoryPublic
                      ? 'Mặc định (Công khai theo lịch cha)'
                      : 'Mặc định (Riêng tư theo lịch cha)'}
                  </option>
                )}
                <option value="private">Riêng tư (Chỉ mình tôi & khách mời)</option>
                {vm.isSelectedCategoryPublic && (
                  <option value="public">Công khai (Mọi người có thể xem)</option>
                )}
              </select>

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

          <div className="flex items-start gap-3">
            <span className="mt-1 grid size-8 shrink-0 place-items-center text-slate-400">
              <Icon className="size-4.5" name="notes" />
            </span>
            <textarea
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs text-slate-800 outline-hidden transition-all focus:border-blue-600 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white disabled:opacity-75 disabled:cursor-not-allowed"
              disabled={!vm.canModify}
              onChange={(e) => vm.setDescription(e.target.value)}
              placeholder="Thêm nội dung mô tả, ghi chú chi tiết..."
              rows={3}
              value={vm.description}
            />
          </div>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/50 px-4 py-3 sm:px-6 dark:border-white/10 dark:bg-white/2">
          {isEditing && vm.isOwner ? (
            <div className="flex items-center gap-2">
              <button
                className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30 transition-colors"
                onClick={() => vm.setShowDeleteConfirm(true)}
                type="button"
              >
                <Icon className="size-3.5" name="trash" />
                <span>Xóa {isTask ? 'nhiệm vụ' : 'sự kiện'}</span>
              </button>
              {!isTask && (
                <button
                  className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/70 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300 transition-colors"
                  onClick={() => setIsShareModalOpen(true)}
                  type="button"
                >
                  <Icon className="size-3.5" name="calendar" />
                  <span>Chia sẻ sự kiện</span>
                </button>
              )}
            </div>
          ) : isEditing && vm.isGuest && vm.guestStatus === 'accepted' ? (
            <button
              className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/70 px-3.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 transition-colors dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-400"
              disabled={vm.isDeleting}
              onClick={() => vm.setShowLeaveConfirm(true)}
              type="button"
            >
              <Icon className="size-3.5" name="close" />
              <span>Rời khỏi sự kiện</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2.5">
            <button
              className="rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 transition-colors"
              onClick={onClose}
              type="button"
            >
              Hủy
            </button>
            {vm.canModify || vm.canInviteOthers ? (
              <button
                className="rounded-xl bg-blue-600 px-5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition-colors"
                disabled={vm.isSubmitting}
                onClick={vm.handleSubmit}
                type="button"
              >
                {vm.isSubmitting
                  ? 'Đang lưu...'
                  : !vm.canModify && vm.canInviteOthers
                  ? 'Lưu khách mời'
                  : isEditing
                  ? 'Cập nhật'
                  : 'Lưu'}
              </button>
            ) : (
              <span className="rounded-xl bg-slate-100 px-4 py-1.5 text-xs font-semibold text-slate-500 dark:bg-white/10 dark:text-slate-400 select-none">
                Chế độ chỉ xem
              </span>
            )}
          </div>
        </div>

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
                          className={`size-8 rounded-full text-xs font-bold transition-all ${isSelected
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

              <div className="space-y-2.5 pt-2">
                <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Kết thúc:
                </span>
                <div className="space-y-2 text-xs">
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

              {vm.customRecurrenceError && (
                <p className="text-xs font-semibold text-rose-500" role="alert">
                  {vm.customRecurrenceError}
                </p>
              )}

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

        {sharedActionModals}

        <EventShareModal
          event={initialEvent ?? null}
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          onUpdated={() => {
            props.onSaved()
          }}
        />

        <RecurrenceScopeModal
          action="update"
          entryType={vm.entryType}
          isFirstOccurrence={
            props.isFirstOccurrence ??
            (!initialEvent ||
              !props.initialDate ||
              props.initialDate.toDateString() === new Date(initialEvent.startDate).toDateString() ||
              props.initialDate.getTime() <= new Date(initialEvent.startDate).getTime())
          }
          isOpen={vm.showEditScopeModal}
          isSubmitting={vm.isSubmitting}
          onCancel={vm.handleCancelEditScope}
          onConfirm={(mode) => void vm.handleConfirmEditScope(mode)}
          targetDate={props.initialDate ?? (initialEvent ? new Date(initialEvent.startDate) : new Date())}
          title={vm.title}
        />

        {Boolean(vm.guestToRemove) && (
          <div
            aria-modal="true"
            className="fixed inset-0 z-70 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-2xs"
            role="dialog"
          >
            <div
              className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl dark:border-white/10 dark:bg-[#021024] space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                  <Icon className="size-5" name="trash" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Xóa khách mời khỏi sự kiện?
                  </h4>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Bạn có chắc chắn muốn xóa khách mời <span className="font-semibold text-slate-700 dark:text-slate-200">{vm.guestToRemove}</span> khỏi danh sách không?
                    {isEditing ? ' Nhấn Cập nhật sự kiện sau đó để lưu thay đổi.' : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-white/10">
                <button
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 transition-colors"
                  onClick={vm.handleCancelRemoveGuest}
                  type="button"
                >
                  Hủy
                </button>
                <button
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition-colors"
                  onClick={vm.handleConfirmRemoveGuest}
                  type="button"
                >
                  Xác nhận xóa
                </button>
              </div>
            </div>
          </div>
        )}

        {vm.pendingRecurrence && (
          <div
            aria-modal="true"
            className="fixed inset-0 z-70 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-2xs"
            onClick={vm.handleCancelRecurrenceChange}
            role="dialog"
          >
            <div
              className="w-full max-w-lg space-y-5 rounded-[28px] border border-slate-200/80 bg-[#f0f4f9] p-6 sm:p-7 shadow-2xl dark:border-white/10 dark:bg-[#052659]"
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <h4 className="text-xl sm:text-2xl font-normal text-slate-900 dark:text-white">
                  Việc cần làm định kỳ không được có thời hạn
                </h4>
                <p className="mt-2.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  Khi chuyển việc cần làm này thành việc cần làm định kỳ, thời hạn sẽ bị xoá
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                <button
                  className="rounded-full px-5 py-2.5 text-sm font-medium text-[#0b57d0] hover:bg-[#0b57d0]/10 dark:text-blue-300 dark:hover:bg-white/10 transition-colors"
                  onClick={vm.handleCancelRecurrenceChange}
                  type="button"
                >
                  Quay lại chế độ chỉnh sửa
                </button>
                <button
                  className="rounded-full bg-[#0b57d0] px-6 py-2.5 text-sm font-medium text-white shadow-xs hover:bg-[#0842a0] transition-colors"
                  onClick={vm.handleConfirmRecurrenceWithoutDeadline}
                  type="button"
                >
                  Vẫn chuyển thành việc cần làm định kỳ
                </button>
              </div>
            </div>
          </div>
        )}

        {vm.showPriorityConfirmDialog && vm.pendingPriority && (
          <div
            aria-modal="true"
            className="fixed inset-0 z-70 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-2xs"
            role="dialog"
          >
            <div
              className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl dark:border-white/10 dark:bg-[#021024] space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                  <Icon className="size-5" name="bell" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Áp dụng thông báo cho mức {PRIORITY_CONFIG[vm.pendingPriority]?.label}?
                  </h4>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Mức ưu tiên <span className="font-bold text-slate-700 dark:text-slate-200">{PRIORITY_CONFIG[vm.pendingPriority]?.label}</span> có cấu hình thông báo khuyến nghị:
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                    {PRIORITY_CONFIG[vm.pendingPriority]?.defaultReminders.map((r, idx) => (
                      <li className="flex items-center gap-1.5" key={idx}>
                        <span className="size-1.5 rounded-full bg-blue-500" />
                        <span>
                          Trước {r.quantity} {r.unit === 'minutes' ? 'phút' : r.unit === 'hours' ? 'giờ' : r.unit === 'days' ? 'ngày' : 'tuần'} qua {r.method === 'email' ? 'Email' : 'Thông báo'}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Bạn có muốn áp dụng cấu hình này và thay thế danh sách thông báo hiện tại không?
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-white/10">
                <button
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 transition-colors"
                  onClick={vm.handleKeepCurrentConfig}
                  type="button"
                >
                  Giữ nguyên thông báo
                </button>
                <button
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors"
                  onClick={vm.handleApplyPriorityConfig}
                  type="button"
                >
                  Áp dụng cấu hình mới
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/modules/auth/viewmodels/useAuth'
import { Icon } from '@/shared/components/Icon'
import { useToast } from '@/shared/viewmodels/useToast'
import type { CalendarEvent, RecurrenceConfig } from '../models/calendar.types'
import { calendarApi } from '../services/calendarApi'
import { expandAllRecurringEvents } from '../utils/recurrenceExpander'
import { buildEventsByDateMap } from '../utils/calendarLayout'

interface PublicCalendarMeta {
  id: string
  name: string
  color: string
  description: string
  timeZone: string
  ownerName: string
}

interface PublicEventRaw {
  id: string
  title: string
  description: string
  startDate: string
  endDate: string
  isAllDay: boolean
  location: string
  onlineMeetingUrl: string
  color: string
  timeZone?: string
  recurrence?: RecurrenceConfig
  exceptionDates: string[]
  isMaskedBusy: boolean
}

function toCalendarEventAdapter(item: PublicEventRaw, categoryId: string): CalendarEvent & { isMaskedBusy?: boolean } {
  return {
    id: item.id,
    userId: '',
    calendarId: categoryId,
    entryType: 'event',
    title: item.title,
    description: item.description,
    priority: 'medium',
    startDate: item.startDate,
    endDate: item.endDate,
    isAllDay: item.isAllDay,
    location: item.location,
    onlineMeetingUrl: item.onlineMeetingUrl,
    submissionUrl: '',
    color: item.color,
    availability: item.isMaskedBusy ? 'busy' : 'free',
    visibility: item.isMaskedBusy ? 'private' : 'public',
    timeZone: item.timeZone,
    isCompleted: false,
    checklist: [],
    reminders: [],
    recurrence: item.recurrence,
    exceptionDates: item.exceptionDates,
    isMaskedBusy: item.isMaskedBusy,
  }
}

export function PublicCalendarPage() {
  const { publicToken = '' } = useParams<{ publicToken: string }>()
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const [category, setCategory] = useState<PublicCalendarMeta | null>(null)
  const [rawEvents, setRawEvents] = useState<PublicEventRaw[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isOwnCalendar, setIsOwnCalendar] = useState(false)
  const [isSubscribing, setIsSubscribing] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<(CalendarEvent & { isMaskedBusy?: boolean }) | null>(null)

  const fetchPublicData = useCallback(async () => {
    try {
      setIsLoading(true)
      setErrorMsg(null)
      const res = await calendarApi.getPublicCalendar(publicToken)
      if (res.data) {
        setCategory(res.data.category)
        setRawEvents(res.data.events)
        if (user) {
          const catRes = await calendarApi.getCategories().catch(() => null)
          const matched = catRes?.data?.categories?.find((c) => c.id === res.data.category.id)
          setIsOwnCalendar(Boolean(matched && matched.myRole === 'owner'))
          setIsSubscribed(Boolean(matched?.isSubscribed))
        }
      }
    } catch (err: unknown) {
      const maybeErr = err as { message?: string }
      setErrorMsg(
        maybeErr.message || 'Lịch công khai không tồn tại hoặc đã chuyển sang chế độ riêng tư.',
      )
      setCategory(null)
    } finally {
      setIsLoading(false)
    }
  }, [publicToken, user])

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(() => {
      if (active) void fetchPublicData()
    }, 0)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [fetchPublicData])

  const handleToggleSubscribe = async () => {
    if (!category) return
    if (!user) {
      navigate('/login', { state: { from: location } })
      return
    }
    try {
      setIsSubscribing(true)
      if (isSubscribed) {
        await calendarApi.unsubscribePublicCalendar(category.id)
        setIsSubscribed(false)
        showToast('Đã bỏ theo dõi lịch công khai.', 'info')
      } else {
        await calendarApi.subscribePublicCalendar(publicToken)
        setIsSubscribed(true)
        showToast('Đã theo dõi lịch công khai. Lịch đã được thêm vào thanh bên của bạn.', 'success')
      }
    } catch (err: unknown) {
      const maybeErr = err as { message?: string }
      showToast(maybeErr.message || 'Không thể cập nhật trạng thái theo dõi.', 'error')
    } finally {
      setIsSubscribing(false)
    }
  }

  const handleExportIcs = async () => {
    try {
      setIsExporting(true)
      await calendarApi.exportPublicCalendarIcs(publicToken)
      showToast('Đã xuất file .ics thành công!', 'success')
    } catch {
      showToast('Không thể xuất file .ics lúc này.', 'error')
    } finally {
      setIsExporting(false)
    }
  }

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const windowStart = new Date(year, month - 1, 1)
  const windowEnd = new Date(year, month + 2, 0, 23, 59, 59)

  const adapted = category ? rawEvents.map((e) => toCalendarEventAdapter(e, category.id)) : []
  const expanded = expandAllRecurringEvents(adapted, windowStart, windowEnd)
  const eventsByDate = buildEventsByDateMap(expanded)

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startOffset = (firstDay.getDay() + 6) % 7
  const totalCells = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7
  const weekdays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#021024] dark:text-white">
      <header className="border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-xs dark:border-white/10 dark:bg-[#021024]/90">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <Link className="flex items-center gap-2 font-extrabold text-slate-900 dark:text-white" to={user ? '/calendar' : '/'}>
            <span className="grid size-8 place-items-center rounded-xl bg-blue-600 text-white">
              <Icon className="size-4" name="calendar" />
            </span>
            <span className="text-sm">EduTrack Public Calendar</span>
          </Link>

          <div className="flex items-center gap-2">
            {user ? (
              <Link
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                to="/calendar"
              >
                Về Lịch của tôi
              </Link>
            ) : (
              <Link
                className="rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
                state={{ from: location }}
                to="/login"
              >
                Đăng nhập EduTrack
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-4 sm:p-6">
        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
            Đang tải lịch công khai...
          </div>
        ) : errorMsg || !category ? (
          <div className="mx-auto max-w-lg rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-xs dark:border-rose-900/40 dark:bg-white/5 space-y-3">
            <h1 className="text-base font-bold">Không thể mở lịch công khai</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {errorMsg || 'Lịch công khai không tồn tại hoặc đã chuyển sang chế độ riêng tư.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs dark:border-white/10 dark:bg-white/5">
              <div className="flex items-start gap-3 min-w-0">
                <span
                  className="mt-1 h-10 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate text-lg font-extrabold">{category.name}</h1>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                      Công khai • Chỉ xem
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Chủ lịch: <strong className="text-slate-700 dark:text-slate-200">{category.ownerName}</strong> • Múi giờ: {category.timeZone}
                  </p>
                  {category.description && (
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{category.description}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/10 dark:text-white"
                  disabled={isExporting}
                  onClick={() => void handleExportIcs()}
                  type="button"
                >
                  {isExporting ? 'Đang xuất...' : 'Xuất file .ics'}
                </button>

                {!isOwnCalendar && (
                  <button
                    className={`rounded-xl px-4 py-2 text-xs font-bold shadow-xs transition ${
                      isSubscribed
                        ? 'border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-400'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                    disabled={isSubscribing}
                    onClick={() => void handleToggleSubscribe()}
                    type="button"
                  >
                    {isSubscribing
                      ? 'Đang xử lý...'
                      : isSubscribed
                        ? 'Đang theo dõi (Bỏ theo dõi)'
                        : '+ Theo dõi lịch'}
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-white/5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-bold capitalize">
                  {currentDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
                </h2>
                <div className="flex items-center gap-1.5">
                  <button
                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/10"
                    onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                    type="button"
                  >
                    Tháng trước
                  </button>
                  <button
                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/10"
                    onClick={() => setCurrentDate(new Date())}
                    type="button"
                  >
                    Hôm nay
                  </button>
                  <button
                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/10"
                    onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                    type="button"
                  >
                    Tháng sau
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 border-b border-slate-100 pb-2 text-center text-[11px] font-bold text-slate-500 dark:border-white/10">
                {weekdays.map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-white/10">
                {Array.from({ length: totalCells }).map((_, idx) => {
                  const cellDate = new Date(year, month, 1 - startOffset + idx)
                  const isCurrentMonth = cellDate.getMonth() === month
                  const key = `${cellDate.getFullYear()}-${String(cellDate.getMonth() + 1).padStart(2, '0')}-${String(cellDate.getDate()).padStart(2, '0')}`
                  const dayEvents = eventsByDate[key] ?? []

                  return (
                    <div
                      className={`min-h-24 p-1.5 ${
                        isCurrentMonth ? 'bg-white dark:bg-transparent' : 'bg-slate-50/70 text-slate-400 dark:bg-white/2'
                      }`}
                      key={key}
                    >
                      <div className="mb-1 text-right text-[11px] font-bold">
                        {cellDate.getDate()}
                      </div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map((ev) => {
                          const masked = (ev as CalendarEvent & { isMaskedBusy?: boolean }).isMaskedBusy
                          const timeStr = ev.isAllDay
                            ? 'Cả ngày'
                            : new Date(ev.startDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                          return (
                            <button
                              className={`block w-full truncate rounded px-1.5 py-0.5 text-left text-[10px] font-semibold transition ${
                                masked
                                  ? 'bg-slate-200/80 text-slate-600 dark:bg-white/10 dark:text-slate-300'
                                  : 'text-white hover:opacity-90'
                              }`}
                              key={ev.id}
                              onClick={() => setSelectedEvent(ev as CalendarEvent & { isMaskedBusy?: boolean })}
                              style={masked ? undefined : { backgroundColor: ev.color || category.color }}
                              type="button"
                            >
                              {timeStr} • {ev.title}
                            </button>
                          )
                        })}
                        {dayEvents.length > 3 && (
                          <div className="px-1 text-[10px] font-semibold text-slate-400">
                            +{dayEvents.length - 3} mục khác
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {selectedEvent && (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
          onClick={() => setSelectedEvent(null)}
          role="dialog"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#021024] space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-base font-bold">
                {selectedEvent.isMaskedBusy ? 'Bận (Sự kiện riêng tư)' : selectedEvent.title}
              </h3>
              <button
                aria-label="Đóng"
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
                onClick={() => setSelectedEvent(null)}
                type="button"
              >
                <Icon className="size-4" name="close" />
              </button>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {selectedEvent.isAllDay
                ? new Date(selectedEvent.startDate).toLocaleDateString('vi-VN')
                : `${new Date(selectedEvent.startDate).toLocaleString('vi-VN')} – ${new Date(selectedEvent.endDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`}
            </p>
            {!selectedEvent.isMaskedBusy && selectedEvent.location && (
              <p className="text-xs text-slate-600 dark:text-slate-300">
                <strong>Địa điểm:</strong> {selectedEvent.location}
              </p>
            )}
            {!selectedEvent.isMaskedBusy && selectedEvent.onlineMeetingUrl && (
              <p className="text-xs text-blue-600 dark:text-blue-400 truncate">
                <a href={selectedEvent.onlineMeetingUrl} rel="noreferrer" target="_blank">
                  {selectedEvent.onlineMeetingUrl}
                </a>
              </p>
            )}
            {!selectedEvent.isMaskedBusy && selectedEvent.description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 whitespace-pre-wrap">
                {selectedEvent.description}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Icon } from '@/shared/components/Icon'
import { useToast } from '@/shared/viewmodels/useToast'
import type { SharedEventPreview } from '../models/calendar.types'
import { calendarApi } from '../services/calendarApi'

function formatEventTimeRange(startIso: string, endIso: string, isAllDay: boolean): string {
  const start = new Date(startIso)
  const end = new Date(endIso)
  if (isAllDay) {
    return start.toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }
  const datePart = start.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const startTime = start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  const endTime = end.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  return `${datePart} • ${startTime} – ${endTime}`
}

export function SharedEventPage() {
  const { shareToken = '' } = useParams<{ shareToken: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [event, setEvent] = useState<SharedEventPreview | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [joinMessage, setJoinMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchSharedEvent = useCallback(async () => {
    try {
      setIsLoading(true)
      setErrorMessage(null)
      const res = await calendarApi.getSharedEvent(shareToken)
      setEvent(res.data?.event ?? null)
    } catch (err: unknown) {
      const maybeErr = err as { message?: string }
      setErrorMessage(
        maybeErr.message || 'Sự kiện không còn tồn tại hoặc liên kết đã hết hiệu lực.',
      )
      setEvent(null)
    } finally {
      setIsLoading(false)
    }
  }, [shareToken])

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(() => {
      if (active) void fetchSharedEvent()
    }, 0)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [fetchSharedEvent])

  const handleRequestJoin = async () => {
    try {
      setIsSubmitting(true)
      await calendarApi.requestJoinSharedEvent(shareToken, joinMessage)
      showToast('Đã gửi yêu cầu xin tham gia tới người tạo sự kiện.', 'success')
      setJoinMessage('')
      await fetchSharedEvent()
    } catch (err: unknown) {
      const maybeErr = err as { message?: string }
      showToast(maybeErr.message || 'Không thể gửi yêu cầu tham gia lúc này.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelRequest = async () => {
    try {
      setIsSubmitting(true)
      await calendarApi.cancelJoinRequest(shareToken)
      showToast('Đã hủy yêu cầu xin tham gia.', 'info')
      await fetchSharedEvent()
    } catch (err: unknown) {
      const maybeErr = err as { message?: string }
      showToast(maybeErr.message || 'Không thể hủy yêu cầu lúc này.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAcceptInvite = async () => {
    if (!event) return
    try {
      setIsSubmitting(true)
      await calendarApi.respondInvite(event.id, 'accepted')
      showToast('Đã chấp nhận lời mời tham gia sự kiện.', 'success')
      await fetchSharedEvent()
    } catch (err: unknown) {
      const maybeErr = err as { message?: string }
      showToast(maybeErr.message || 'Không thể phản hồi lời mời.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl py-6 px-3 sm:px-4">
      {isLoading ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center text-sm font-semibold text-slate-500 shadow-xs dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
          Đang tải thông tin sự kiện...
        </div>
      ) : errorMessage || !event ? (
        <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-xs dark:border-rose-900/40 dark:bg-white/5 space-y-4">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
            <Icon className="size-6" name="calendar" />
          </div>
          <h1 className="text-base font-bold text-slate-900 dark:text-white">
            Không thể mở liên kết chia sẻ
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {errorMessage || 'Sự kiện không còn tồn tại hoặc liên kết đã hết hiệu lực.'}
          </p>
          <button
            className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
            onClick={() => navigate('/calendar')}
            type="button"
          >
            Quay về Lịch của tôi
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
          <div className="h-2.5 w-full" style={{ backgroundColor: event.color || '#2563EB' }} />
          <div className="space-y-5 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                  Sự kiện được chia sẻ
                </span>
                <h1 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
                  {event.title}
                </h1>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Người tạo: <span className="font-semibold text-slate-700 dark:text-slate-200">{event.creator.fullName}</span>
                </p>
              </div>
              <button
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                onClick={() => navigate('/calendar')}
                type="button"
              >
                Mở Lịch EduTrack
              </button>
            </div>

            <div className="space-y-2.5 rounded-xl border border-slate-100 bg-slate-50/70 p-4 text-xs dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-200">
                <Icon className="size-4 shrink-0 text-slate-400" name="clock" />
                <span className="font-semibold">
                  {formatEventTimeRange(event.startDate, event.endDate, event.isAllDay)}
                </span>
              </div>

              {event.recurrence && event.recurrence.frequency !== 'none' && (
                <div className="flex items-center gap-2.5 text-blue-700 dark:text-blue-300">
                  <Icon className="size-4 shrink-0" name="calendar" />
                  <span className="font-semibold">
                    Sự kiện lặp lại ({event.recurrence.frequency === 'daily'
                      ? 'Hàng ngày'
                      : event.recurrence.frequency === 'weekly'
                        ? 'Hàng tuần'
                        : event.recurrence.frequency === 'monthly'
                          ? 'Hàng tháng'
                          : event.recurrence.frequency === 'yearly'
                            ? 'Hàng năm'
                            : event.recurrence.frequency === 'weekdays'
                              ? 'Các ngày trong tuần'
                              : 'Theo chu kỳ tùy chỉnh'}) — toàn bộ chuỗi sẽ hiển thị trên lịch của bạn khi được duyệt.
                  </span>
                </div>
              )}

              {event.location && (
                <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-200">
                  <Icon className="size-4 shrink-0 text-slate-400" name="calendar" />
                  <span>Địa điểm: {event.location}</span>
                </div>
              )}

              {event.onlineMeetingUrl && (
                <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-200">
                  <Icon className="size-4 shrink-0 text-slate-400" name="calendar" />
                  <a
                    className="truncate text-blue-600 hover:underline dark:text-blue-400"
                    href={event.onlineMeetingUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {event.onlineMeetingUrl}
                  </a>
                </div>
              )}

              {event.description && (
                <p className="pt-2 border-t border-slate-200/70 dark:border-white/10 text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                  {event.description}
                </p>
              )}
            </div>

            <div className="border-t border-slate-100 pt-4 dark:border-white/10">
              {event.viewerStatus === 'owner' && (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-blue-50/70 p-3.5 text-xs dark:bg-blue-950/30">
                  <span className="font-semibold text-blue-900 dark:text-blue-200">
                    Bạn là người tạo sự kiện này. Hãy mở lịch để chỉnh sửa hoặc duyệt yêu cầu tham gia.
                  </span>
                  <button
                    className="shrink-0 rounded-lg bg-blue-600 px-3.5 py-1.5 font-bold text-white hover:bg-blue-700"
                    onClick={() => navigate('/calendar')}
                    type="button"
                  >
                    Quản lý trên Lịch
                  </button>
                </div>
              )}

              {event.viewerStatus === 'accepted' && (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-emerald-50 p-3.5 text-xs dark:bg-emerald-950/30">
                  <span className="font-bold text-emerald-700 dark:text-emerald-300">
                    ✓ Bạn đã tham gia sự kiện này.
                  </span>
                  <button
                    className="shrink-0 rounded-lg bg-emerald-600 px-3.5 py-1.5 font-bold text-white hover:bg-emerald-700"
                    onClick={() => navigate('/calendar')}
                    type="button"
                  >
                    Xem trên Lịch
                  </button>
                </div>
              )}

              {event.viewerStatus === 'pending_invite' && (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-blue-50 p-3.5 text-xs dark:bg-blue-950/30">
                  <span className="font-semibold text-blue-800 dark:text-blue-200">
                    Bạn đã có lời mời trực tiếp tham gia sự kiện này.
                  </span>
                  <button
                    className="shrink-0 rounded-lg bg-blue-600 px-4 py-1.5 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                    disabled={isSubmitting}
                    onClick={() => void handleAcceptInvite()}
                    type="button"
                  >
                    {isSubmitting ? 'Đang xử lý...' : 'Chấp nhận lời mời'}
                  </button>
                </div>
              )}

              {event.viewerStatus === 'pending_request' && (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-amber-50 p-3.5 text-xs dark:bg-amber-950/30">
                  <span className="font-semibold text-amber-800 dark:text-amber-300">
                    Yêu cầu xin tham gia của bạn đang chờ người tạo duyệt.
                  </span>
                  <button
                    className="shrink-0 rounded-lg border border-rose-200 bg-white px-3.5 py-1.5 font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900/40 dark:bg-white/5 dark:text-rose-400"
                    disabled={isSubmitting}
                    onClick={() => void handleCancelRequest()}
                    type="button"
                  >
                    {isSubmitting ? 'Đang hủy...' : 'Hủy yêu cầu'}
                  </button>
                </div>
              )}

              {(event.viewerStatus === 'none' || event.viewerStatus === 'rejected') && (
                <div className="space-y-3">
                  {event.viewerStatus === 'rejected' && (
                    <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                      Yêu cầu tham gia trước đó của bạn đã bị từ chối. Bạn có thể gửi lại yêu cầu mới nếu cần.
                    </p>
                  )}
                  <textarea
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs text-slate-800 outline-hidden focus:border-blue-600 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white"
                    maxLength={300}
                    onChange={(e) => setJoinMessage(e.target.value)}
                    placeholder="Lời nhắn gửi tới người tạo sự kiện (không bắt buộc)..."
                    rows={2}
                    value={joinMessage}
                  />
                  <div className="flex justify-end">
                    <button
                      className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
                      disabled={isSubmitting}
                      onClick={() => void handleRequestJoin()}
                      type="button"
                    >
                      {isSubmitting ? 'Đang gửi...' : 'Xin tham gia'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

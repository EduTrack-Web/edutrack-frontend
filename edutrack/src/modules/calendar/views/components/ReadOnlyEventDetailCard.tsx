import { useEffect, useState } from 'react'
import {
  AlignLeft,
  Briefcase,
  Calendar as CalendarIcon,
  Link2,
  Lock,
  MapPin,
  MoreVertical,
  Repeat,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react'
import type { CalendarEvent, EventGuest } from '../../models/calendar.types'
import { formatReadOnlyEventSchedule } from '../../models/googleCalendarSync'

interface ReadOnlyEventDetailCardProps {
  event: CalendarEvent
  color: string
  calendarLabel: string
  activeTimeZone: string
  recurrenceLabel?: string
  canRemove: boolean
  removeLabel: string
  isGuest: boolean
  guestStatus: 'pending' | 'accepted' | 'declined'
  canSeeGuestList: boolean
  guests: EventGuest[]
  isSubmitting: boolean
  isDeleting: boolean
  hasChildDialogOpen: boolean
  onClose: () => void
  onRequestDelete: () => void
  onRespondInvite: (status: 'accepted' | 'declined') => void
  onRequestLeave: () => void
}

const VIRTUAL_GOOGLE_CALENDAR_EMAIL_RE =
  /@(group\.(?:v\.)?calendar\.google\.com|holiday\.calendar\.google\.com|import\.calendar\.google\.com)$/i

export function ReadOnlyEventDetailCard({
  event,
  color,
  calendarLabel,
  activeTimeZone,
  recurrenceLabel,
  canRemove,
  removeLabel,
  isGuest,
  guestStatus,
  canSeeGuestList,
  guests,
  isSubmitting,
  isDeleting,
  hasChildDialogOpen,
  onClose,
  onRequestDelete,
  onRespondInvite,
  onRequestLeave,
}: ReadOnlyEventDetailCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !hasChildDialogOpen) {
        if (menuOpen) {
          setMenuOpen(false)
        } else {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hasChildDialogOpen, menuOpen, onClose])

  const scheduleText = formatReadOnlyEventSchedule(
    event.startDate,
    event.endDate,
    event.isAllDay,
    activeTimeZone,
  )

  const visibilityLabel =
    event.visibility === 'public'
      ? 'Công khai'
      : event.visibility === 'private'
        ? 'Riêng tư'
        : 'Mặc định (theo lịch)'

  const availabilityLabel = event.availability === 'free' ? 'Rảnh' : 'Bận'

  const organizerEmail = event.googleSource?.organizer?.email || event.creator?.email || event.creatorEmail || ''
  const organizerDisplay =
    event.googleSource?.organizer?.displayName ||
    event.creator?.fullName ||
    organizerEmail
  const showOrganizer =
    Boolean(organizerDisplay) &&
    !VIRTUAL_GOOGLE_CALENDAR_EMAIL_RE.test(organizerEmail) &&
    organizerDisplay !== calendarLabel &&
    organizerEmail !== event.googleSource?.accountEmail

  return (
    <div
      aria-labelledby="readonly-event-detail-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-2xs"
      onMouseDown={() => {
        if (menuOpen) {
          setMenuOpen(false)
          return
        }
        onClose()
      }}
      role="dialog"
    >
      <div
        className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-3xl border border-slate-200/90 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#021024]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-end gap-0.5">
          {canRemove && (
            <div className="relative">
              <button
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                aria-label="Tùy chọn sự kiện"
                className="grid min-h-11 min-w-11 place-items-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                onClick={() => setMenuOpen((prev) => !prev)}
                type="button"
              >
                <MoreVertical aria-hidden="true" className="size-4.5" />
              </button>

              {menuOpen && (
                <div
                  className="absolute right-0 top-full z-20 mt-1 w-48 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-white/10 dark:bg-[#052659]"
                  role="menu"
                >
                  <button
                    className="flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/40"
                    onClick={() => {
                      setMenuOpen(false)
                      onRequestDelete()
                    }}
                    role="menuitem"
                    type="button"
                  >
                    <Trash2 aria-hidden="true" className="size-4 shrink-0" />
                    <span>{removeLabel}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            aria-label="Đóng"
            className="grid min-h-11 min-w-11 place-items-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4.5" />
          </button>
        </div>

        <div className="mt-1 flex items-start gap-3.5 px-1">
          <span
            aria-hidden="true"
            className="mt-1.5 size-3.5 shrink-0 rounded-sm"
            style={{ backgroundColor: color }}
          />
          <div className="min-w-0 flex-1">
            <h2
              className="break-words text-xl font-semibold leading-snug text-slate-900 dark:text-white"
              id="readonly-event-detail-title"
            >
              {event.title}
            </h2>
            {scheduleText && (
              <p className="mt-1 break-words text-sm text-slate-600 dark:text-slate-300">{scheduleText}</p>
            )}
            {recurrenceLabel && (
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Repeat aria-hidden="true" className="size-3.5 shrink-0" />
                <span className="min-w-0 flex-1 break-words">{recurrenceLabel}</span>
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 space-y-3 px-1 pb-1 text-sm text-slate-700 dark:text-slate-200">
          {event.location?.trim() && (
            <div className="flex items-start gap-3.5">
              <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-slate-500 dark:text-slate-400" />
              <span className="min-w-0 flex-1 break-words">{event.location}</span>
            </div>
          )}

          {event.onlineMeetingUrl?.trim() && (
            <div className="flex items-start gap-3.5">
              <Link2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-slate-500 dark:text-slate-400" />
              <a
                className="min-w-0 flex-1 break-all text-blue-600 hover:underline dark:text-blue-400"
                href={event.onlineMeetingUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                {event.onlineMeetingUrl}
              </a>
            </div>
          )}

          {event.description?.trim() && (
            <div className="flex items-start gap-3.5">
              <AlignLeft aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-slate-500 dark:text-slate-400" />
              <p className="min-w-0 flex-1 whitespace-pre-line break-words leading-relaxed">{event.description}</p>
            </div>
          )}

          <div
            className="flex items-start gap-3.5"
            title={event.googleSource?.accountEmail || calendarLabel}
          >
            <CalendarIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-slate-500 dark:text-slate-400" />
            <span className="min-w-0 flex-1 break-words">{calendarLabel}</span>
          </div>

          {showOrganizer && (
            <div className="flex items-start gap-3.5">
              <User aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-slate-500 dark:text-slate-400" />
              <span className="min-w-0 flex-1 break-words">
                {organizerDisplay}
                {organizerEmail && organizerDisplay !== organizerEmail ? ` (${organizerEmail})` : ''}
              </span>
            </div>
          )}

          {canSeeGuestList && guests.length > 0 && (
            <div className="flex items-start gap-3.5">
              <Users aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-slate-500 dark:text-slate-400" />
              <span className="min-w-0 flex-1 break-words">
                {guests.length} khách mời: {guests.map((g) => g.email).join(', ')}
              </span>
            </div>
          )}

          <div className="flex items-start gap-3.5">
            <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-slate-500 dark:text-slate-400" />
            <span>{visibilityLabel}</span>
          </div>

          <div className="flex items-start gap-3.5">
            <Briefcase aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-slate-500 dark:text-slate-400" />
            <span>{availabilityLabel}</span>
          </div>
        </div>

        {isGuest && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3.5 dark:border-white/10">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {guestStatus === 'accepted'
                ? 'Bạn đã tham gia'
                : guestStatus === 'declined'
                  ? 'Bạn đã từ chối'
                  : 'Phản hồi lời mời'}
            </span>
            <div className="flex items-center gap-2">
              {guestStatus === 'pending' && (
                <>
                  <button
                    className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                    disabled={isSubmitting}
                    onClick={() => onRespondInvite('accepted')}
                    type="button"
                  >
                    Tham gia
                  </button>
                  <button
                    className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/10"
                    disabled={isSubmitting}
                    onClick={() => onRespondInvite('declined')}
                    type="button"
                  >
                    Từ chối
                  </button>
                </>
              )}
              {guestStatus === 'accepted' && (
                <button
                  className="rounded-xl border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900/40 dark:text-rose-400 dark:hover:bg-rose-950/30"
                  disabled={isDeleting}
                  onClick={onRequestLeave}
                  type="button"
                >
                  Rời sự kiện
                </button>
              )}
              {guestStatus === 'declined' && (
                <button
                  className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                  disabled={isSubmitting}
                  onClick={() => onRespondInvite('accepted')}
                  type="button"
                >
                  Tham gia lại
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

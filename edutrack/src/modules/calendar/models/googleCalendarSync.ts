import type {
  GoogleCalendarAccessRole,
  GoogleCalendarConnectionItem,
  GoogleCalendarIntegrationStatus,
  GoogleSyncConflictVersion,
} from './calendar.types'

export const GOOGLE_CONFLICT_FIELD_LABELS: Readonly<Record<string, string>> = {
  title: 'Tiêu đề sự kiện',
  description: 'Mô tả / ghi chú',
  startDate: 'Thời gian bắt đầu',
  endDate: 'Thời gian kết thúc',
  isAllDay: 'Cả ngày',
  location: 'Địa điểm',
  onlineMeetingUrl: 'Liên kết họp trực tuyến',
  availability: 'Trạng thái bận / rảnh',
  visibility: 'Quyền riêng tư',
  timeZone: 'Múi giờ',
  recurrence: 'Quy tắc lặp lại',
}

export const resolveGoogleSyncRedirectFeedback = (params: {
  googleSyncSuccess: string | null
  googleSyncError: string | null
  integrationId?: string | null
}): {
  type: 'success' | 'warning' | 'error'
  message: string
  openConflicts: boolean
  openCalendarSelectionIntegrationId?: string
} | null => {
  if (params.googleSyncSuccess === 'ACCOUNT_CONNECTED') {
    return {
      type: 'success',
      message: 'Liên kết tài khoản Google thành công. Hãy chọn các lịch Google bạn muốn đồng bộ.',
      openConflicts: false,
      ...(params.integrationId ? { openCalendarSelectionIntegrationId: params.integrationId } : {}),
    }
  }
  if (params.googleSyncSuccess === 'SYNCED') {
    return {
      type: 'success',
      message: 'Đồng bộ Google Lịch thành công.',
      openConflicts: false,
    }
  }
  if (params.googleSyncSuccess === 'CONNECTED_WITH_CONFLICTS') {
    return {
      type: 'warning',
      message: 'Đã liên kết Google Lịch, nhưng có xung đột dữ liệu cần bạn chọn bản ghi ưu tiên.',
      openConflicts: true,
    }
  }
  if (params.googleSyncError) {
    if (params.googleSyncError === 'GOOGLE_CALENDAR_PERMISSION_DENIED') {
      return {
        type: 'error',
        message: 'Không thể đồng bộ do chưa cấp quyền',
        openConflicts: false,
      }
    }
    if (params.googleSyncError === 'GOOGLE_CALENDAR_CONNECT_FAILED') {
      return {
        type: 'error',
        message: 'Không thể kết nối Google, vui lòng thử lại',
        openConflicts: false,
      }
    }
    if (params.googleSyncError === 'GOOGLE_ACCOUNT_MISMATCH') {
      return {
        type: 'error',
        message: 'Vui lòng chọn đúng tài khoản Google đã liên kết trước đó để kết nối lại.',
        openConflicts: false,
      }
    }
    if (params.googleSyncError === 'GOOGLE_REFRESH_TOKEN_MISSING') {
      return {
        type: 'error',
        message: 'Google chưa cấp đủ quyền đồng bộ nền. Vui lòng thử liên kết lại.',
        openConflicts: false,
      }
    }
    return {
      type: 'error',
      message: 'Lỗi kết nối Google Lịch trong lúc đồng bộ. Vui lòng thử đồng bộ lại.',
      openConflicts: false,
    }
  }
  return null
}

export const sortGoogleIntegrations = (
  integrations: readonly GoogleCalendarIntegrationStatus[],
): GoogleCalendarIntegrationStatus[] =>
  [...integrations].sort((a, b) => {
    if (a.isPrimarySyncAccount !== b.isPrimarySyncAccount) {
      return a.isPrimarySyncAccount ? -1 : 1
    }
    return a.googleEmail.localeCompare(b.googleEmail)
  })

export const getGoogleAccessRoleLabel = (role: GoogleCalendarAccessRole): string => {
  switch (role) {
    case 'owner':
      return 'Chủ sở hữu'
    case 'writer':
      return 'Có quyền sửa'
    case 'reader':
    case 'freeBusyReader':
    default:
      return 'Chỉ xem'
  }
}

export const getGoogleCalendarSyncStatusLabel = (cal: GoogleCalendarConnectionItem): string => {
  switch (cal.syncStatus) {
    case 'initial_sync_pending':
      return 'Chờ đồng bộ ban đầu'
    case 'initial_sync_running':
      return `Đang tải (${cal.fullSyncProgress?.syncedCount ?? 0} sự kiện)`
    case 'initial_sync_failed':
      return 'Đồng bộ ban đầu lỗi'
    case 'error':
      return 'Đồng bộ gặp lỗi'
    case 'active':
      return cal.lastSyncedAt
        ? `Đồng bộ lúc ${new Date(cal.lastSyncedAt).toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })}`
        : 'Đang hoạt động'
    default:
      return 'Chưa chọn'
  }
}

export const formatConflictVersionRange = (
  version: Pick<GoogleSyncConflictVersion, 'startDate' | 'endDate' | 'isAllDay'>,
): string => {
  const start = new Date(version.startDate)
  const end = new Date(version.endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${version.startDate} – ${version.endDate}`
  }

  if (version.isAllDay) {
    const startLabel = start.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const endLabel = end.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    return startLabel === endLabel ? `Cả ngày (${startLabel})` : `Cả ngày (${startLabel} – ${endLabel})`
  }

  const sameDay = start.toDateString() === end.toDateString()
  const datePart = start.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const startTime = start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
  const endTime = end.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })

  if (sameDay) {
    return `${datePart}, ${startTime} – ${endTime}`
  }
  const endDatePart = end.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  return `${datePart} ${startTime} – ${endDatePart} ${endTime}`
}

const capitalizeFirst = (text: string): string =>
  text ? text.charAt(0).toUpperCase() + text.slice(1) : text

const getZonedDateParts = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const getNum = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((p) => p.type === type)?.value ?? 0)

  const year = getNum('year')
  const month = getNum('month')
  const day = getNum('day')
  const hourStr = String(getNum('hour') % 24).padStart(2, '0')
  const minuteStr = String(getNum('minute')).padStart(2, '0')
  const weekdayRaw = new Intl.DateTimeFormat('vi-VN', { timeZone, weekday: 'long' }).format(date)

  return {
    key: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    year,
    month,
    day,
    time: `${hourStr}:${minuteStr}`,
    weekday: capitalizeFirst(weekdayRaw),
  }
}

export const formatReadOnlyEventSchedule = (
  startIso: string,
  endIso: string,
  isAllDay: boolean,
  timeZone: string,
  currentYear = new Date().getFullYear(),
): string => {
  const start = new Date(startIso)
  const end = new Date(endIso)
  if (Number.isNaN(start.getTime())) return ''

  let safeZone = timeZone || 'Asia/Ho_Chi_Minh'
  try {
    new Intl.DateTimeFormat('vi-VN', { timeZone: safeZone })
  } catch {
    safeZone = 'Asia/Ho_Chi_Minh'
  }

  const s = getZonedDateParts(start, safeZone)
  const e = Number.isNaN(end.getTime()) ? s : getZonedDateParts(end, safeZone)
  const formatDay = (p: ReturnType<typeof getZonedDateParts>, includeYear: boolean) =>
    includeYear
      ? `${p.weekday}, ${p.day} tháng ${p.month}, ${p.year}`
      : `${p.weekday}, ${p.day} tháng ${p.month}`

  const sameDay = s.key === e.key
  if (isAllDay) {
    if (sameDay) {
      return formatDay(s, s.year !== currentYear)
    }
    const showYear = s.year !== currentYear || e.year !== currentYear || s.year !== e.year
    return `${formatDay(s, s.year !== e.year && showYear)} – ${formatDay(e, showYear)}`
  }

  if (sameDay) {
    return `${formatDay(s, s.year !== currentYear)} • ${s.time} – ${e.time}`
  }
  const showYear = s.year !== currentYear || e.year !== currentYear || s.year !== e.year
  return `${s.time}, ${formatDay(s, s.year !== e.year && showYear)} – ${e.time}, ${formatDay(e, showYear)}`
}

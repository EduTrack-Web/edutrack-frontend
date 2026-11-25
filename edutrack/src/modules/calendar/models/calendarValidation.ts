import type { CreateCategoryInput, CreateEventInput, SubtaskItem } from './calendar.types'

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/
const VALID_PRIORITIES: readonly string[] = ['low', 'medium', 'high', 'urgent']
const MAX_TITLE_LENGTH = 150
const MAX_REMINDERS = 10
const MAX_REMINDER_MINUTES = 40320
const MAX_CHECKLIST_ITEMS = 50
const MAX_CHECKLIST_TITLE_LENGTH = 150
const RECURRENCE_ERROR =
  'Quy tắc lặp lại không hợp lệ. Kiểm tra chu kỳ (1–99), ngày kết thúc và số lần lặp (1–365).'

const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

const failIf = (condition: boolean, message: string): string | null => (condition ? message : null)

const firstFailure = (...checks: Array<string | null>): string | undefined =>
  checks.find((check): check is string => check !== null)

const collectErrors = (entries: Record<string, string | null | undefined>): Record<string, string> =>
  Object.fromEntries(Object.entries(entries).filter((entry): entry is [string, string] => Boolean(entry[1])))

const toTime = (value?: string | null): number => (value ? Date.parse(value.trim()) : Number.NaN)

const isOptionalIntInRange = (value: number | null | undefined, min: number, max: number): boolean =>
  value === null || value === undefined || (Number.isInteger(value) && value >= min && value <= max)

export const DEFAULT_EVENT_TITLE = 'Không có tiêu đề'

export const validateEventTitle = (rawTitle: string): string | undefined => {
  const title = rawTitle.trim()
  return firstFailure(
    failIf(title.length > MAX_TITLE_LENGTH, `Tiêu đề không được vượt quá ${MAX_TITLE_LENGTH} ký tự`),
  )
}

export const validateChecklistStep = (rawTitle: string, existing: SubtaskItem[]): string | undefined => {
  const title = rawTitle.trim()
  const isDuplicate = existing.some((item) => item.title.trim().toLowerCase() === title.toLowerCase())
  return firstFailure(
    failIf(!title, 'Vui lòng nhập nội dung bước cần làm'),
    failIf(existing.length >= MAX_CHECKLIST_ITEMS, `Checklist tối đa ${MAX_CHECKLIST_ITEMS} bước`),
    failIf(title.length > MAX_CHECKLIST_TITLE_LENGTH, `Mỗi bước tối đa ${MAX_CHECKLIST_TITLE_LENGTH} ký tự`),
    failIf(isDuplicate, 'Bước này đã có trong checklist'),
  )
}

export const validateGuestInput = (
  rawInput: string,
  existingGuests: Array<{ email: string }>,
  currentUserEmail?: string,
  creatorEmail?: string,
  allowUsername = true,
): string | undefined => {
  const trimmed = rawInput.trim().toLowerCase()
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const usernameRegex = /^[a-zA-Z0-9._-]{3,40}$/
  const isValidFormat = emailRegex.test(trimmed) || (allowUsername && usernameRegex.test(trimmed))
  const isSelf = Boolean(currentUserEmail && trimmed === currentUserEmail.trim().toLowerCase())
  const isCreator = Boolean(creatorEmail && trimmed === creatorEmail.trim().toLowerCase())
  const isDuplicate = existingGuests.some((g) => g.email.trim().toLowerCase() === trimmed)

  return firstFailure(
    failIf(!trimmed, allowUsername ? 'Vui lòng nhập email hoặc username khách mời' : 'Vui lòng nhập địa chỉ email người nhận chia sẻ'),
    failIf(!isValidFormat, allowUsername ? 'Email hoặc username không đúng định dạng (username từ 3 đến 40 ký tự)' : 'Email không đúng định dạng (ví dụ: user@example.com)'),
    failIf(isSelf, 'Bạn không thể tự mời chính mình'),
    failIf(isCreator, 'Không thể mời lại người tạo sự kiện'),
    failIf(isDuplicate, 'Người này đã có trong danh sách'),
  )
}

export const validateCustomRecurrence = (config: {
  interval: number
  unit: 'day' | 'week' | 'month' | 'year'
  daysOfWeek: number[]
  endCondition: 'never' | 'until' | 'count'
  untilDate: string
  count: number
  startDate: string
}): string | undefined => {
  const { interval, unit, daysOfWeek, endCondition, untilDate, count, startDate } = config
  const start = toTime(startDate)
  const until = toTime(untilDate)

  return firstFailure(
    failIf(!Number.isInteger(interval) || interval < 1 || interval > 99, 'Chu kỳ lặp lại phải từ 1 đến 99'),
    failIf(unit === 'week' && daysOfWeek.length === 0, 'Vui lòng chọn ít nhất một ngày trong tuần để lặp lại'),
    failIf(endCondition === 'count' && (!Number.isInteger(count) || count < 1 || count > 365), 'Số lần lặp lại phải từ 1 đến 365'),
    failIf(endCondition === 'until' && (!untilDate || Number.isNaN(until)), 'Vui lòng chọn ngày kết thúc lặp lại'),
    failIf(endCondition === 'until' && !Number.isNaN(start) && until < start, 'Ngày kết thúc lặp lại không được sớm hơn ngày bắt đầu'),
  )
}

export const validateEventForm = (input: Partial<CreateEventInput>): Record<string, string> => {
  const start = toTime(input.startDate)
  const end = toTime(input.endDate)
  const deadline = toTime(input.deadline)
  const hasDeadline = Boolean(input.deadline)
  const recurrence = input.recurrence
  const isRecurring = Boolean(recurrence && recurrence.frequency !== 'none')
  const reminders = input.reminders ?? []
  const checklist = input.checklist ?? []
  const description = input.description ?? ''
  const location = input.location ?? ''
  const meetingUrl = input.onlineMeetingUrl?.trim() ?? ''
  const submissionUrl = input.submissionUrl?.trim() ?? ''
  const color = input.color?.trim() ?? ''

  const hasInvalidReminderRange = reminders.some(
    ({ minutesBefore }) => !Number.isInteger(minutesBefore) || minutesBefore < 0 || minutesBefore > MAX_REMINDER_MINUTES,
  )
  const hasDuplicateReminder = reminders.some(
    (reminder, index) =>
      reminders.findIndex(
        (item) => item.method === reminder.method && item.minutesBefore === reminder.minutesBefore,
      ) !== index,
  )

  const recurrenceInvalid =
    isRecurring &&
    recurrence !== undefined &&
    (!isOptionalIntInRange(recurrence.interval, 1, 99) ||
      !isOptionalIntInRange(recurrence.count, 1, 365) ||
      (recurrence.until !== null && recurrence.until !== undefined && !(toTime(recurrence.until) >= start)) ||
      (recurrence.frequency === 'custom' && (recurrence.daysOfWeek?.length ?? 0) === 0))

  return collectErrors({
    title: validateEventTitle(input.title ?? ''),
    priority: failIf(
      input.priority !== undefined && !VALID_PRIORITIES.includes(input.priority),
      'Mức độ ưu tiên không hợp lệ',
    ),
    startDate: failIf(Number.isNaN(start), 'Vui lòng chọn thời gian hợp lệ'),
    endDate: firstFailure(
      failIf(Number.isNaN(end), 'Vui lòng chọn thời gian kết thúc / hạn chót hợp lệ'),
      failIf(end < start, 'Thời gian kết thúc không được sớm hơn thời gian bắt đầu'),
    ),
    deadline: firstFailure(
      failIf(hasDeadline && Number.isNaN(deadline), 'Vui lòng chọn hạn chót hợp lệ'),
      failIf(hasDeadline && deadline < start, 'Hạn chót không được sớm hơn thời gian bắt đầu'),
      failIf(hasDeadline && isRecurring, 'Nhiệm vụ lặp lại không được có hạn chót'),
    ),
    recurrence: failIf(recurrenceInvalid, RECURRENCE_ERROR),
    reminders: firstFailure(
      failIf(reminders.length > MAX_REMINDERS, `Tối đa ${MAX_REMINDERS} mốc nhắc`),
      failIf(hasInvalidReminderRange, 'Mốc nhắc phải từ 0 đến 40320 phút (tối đa 4 tuần)'),
      failIf(hasDuplicateReminder, 'Không được trùng kênh nhắc ở cùng thời điểm'),
    ),
    checklist: firstFailure(
      failIf(checklist.length > MAX_CHECKLIST_ITEMS, `Checklist tối đa ${MAX_CHECKLIST_ITEMS} bước`),
      failIf(
        checklist.some((item) => item.title.trim().length > MAX_CHECKLIST_TITLE_LENGTH),
        `Mỗi bước tối đa ${MAX_CHECKLIST_TITLE_LENGTH} ký tự`,
      ),
    ),
    description: failIf(description.length > 2000, 'Nội dung mô tả không được vượt quá 2000 ký tự'),
    location: failIf(location.length > 200, 'Địa điểm không được vượt quá 200 ký tự'),
    onlineMeetingUrl: failIf(
      Boolean(meetingUrl) && !isValidUrl(meetingUrl),
      'Link họp trực tuyến không đúng định dạng URL',
    ),
    submissionUrl: failIf(
      Boolean(submissionUrl) && !isValidUrl(submissionUrl),
      'Link nộp bài / tài liệu không đúng định dạng URL',
    ),
    color: failIf(Boolean(color) && !HEX_COLOR_REGEX.test(color), 'Mã màu HEX không hợp lệ (ví dụ: #2563EB)'),
  })
}

export const validateCategoryForm = (input: Partial<CreateCategoryInput>): Record<string, string> => {
  const errors: Record<string, string> = {}

  const name = input.name?.trim() ?? ''
  if (!name) {
    errors.name = 'Vui lòng nhập tên lịch'
  } else if (name.length > 100) {
    errors.name = 'Tên lịch không được vượt quá 100 ký tự'
  }

  if (input.color && input.color.trim() && !HEX_COLOR_REGEX.test(input.color.trim())) {
    errors.color = 'Mã màu HEX không hợp lệ (ví dụ: #2563EB)'
  }

  if (input.description && input.description.trim().length > 500) {
    errors.description = 'Mô tả không được vượt quá 500 ký tự'
  }

  const settings = input.settings
  if (settings) {
    const { workingHoursStart, workingHoursEnd, defaultDurationMinutes, reminders } = settings
    if (!workingHoursStart || !workingHoursEnd || workingHoursEnd <= workingHoursStart
      || !Number.isInteger(defaultDurationMinutes) || defaultDurationMinutes < 5 || defaultDurationMinutes > 1440) {
      errors.settings = 'Kiểm tra ngày bắt đầu tuần, khung giờ hoạt động và thời lượng mặc định (5–1440 phút).'
    } else if (reminders.some(({ method, minutesBefore }, index) => !Number.isInteger(minutesBefore)
      || minutesBefore < 0 || minutesBefore > 40320
      || reminders.slice(0, index).some((item) => item.method === method && item.minutesBefore === minutesBefore))) {
      errors.settings = 'Mốc nhắc phải từ 0 đến 40320 phút và không được trùng kênh cùng thời điểm.'
    }
  }

  return errors
}

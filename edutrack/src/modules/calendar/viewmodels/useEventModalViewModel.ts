import { useEffect, useRef, useState } from 'react'
import type {
  CalendarCategory,
  CalendarEvent,
  CreateEventInput,
  EntryType,
  EventAvailability,
  EventGuest,
  EventPriority,
  EventVisibility,
  RecurrenceConfig,
  RecurrenceFrequency,
  ReminderItem,
  ReminderMethod,
  SubtaskItem,
} from '../models/calendar.types'
import { validateEventForm } from '../models/calendarValidation'
import { calendarApi } from '../services/calendarApi'
import { useAuth } from '@/modules/auth/viewmodels/useAuth'

export const EXTENDED_CALENDAR_COLORS = [
  '#2563EB',
  '#0284C7',
  '#0EA5E9',
  '#0D9488',
  '#059669',
  '#16A34A',
  '#65A30D',
  '#CA8A04',
  '#D97706',
  '#EA580C',
  '#DC2626',
  '#E11D48',
  '#DB2777',
  '#9333EA',
  '#7C3AED',
  '#4F46E5',
  '#475569',
  '#57534E',
]

export type ReminderUnit = 'minutes' | 'hours' | 'days' | 'weeks'

export interface ReminderFormItem {
  id: string
  method: ReminderMethod
  quantity: number
  unit: ReminderUnit
}

export function minutesToReminderForm(minutes: number): { quantity: number; unit: ReminderUnit } {
  if (minutes >= 10080 && minutes % 10080 === 0) {
    return { quantity: minutes / 10080, unit: 'weeks' }
  }
  if (minutes >= 1440 && minutes % 1440 === 0) {
    return { quantity: minutes / 1440, unit: 'days' }
  }
  if (minutes >= 60 && minutes % 60 === 0) {
    return { quantity: minutes / 60, unit: 'hours' }
  }
  return { quantity: minutes, unit: 'minutes' }
}

export function reminderFormToMinutes(quantity: number, unit: ReminderUnit): number {
  const qty = Math.max(1, Number(quantity) || 1)
  switch (unit) {
    case 'weeks':
      return qty * 10080
    case 'days':
      return qty * 1440
    case 'hours':
      return qty * 60
    case 'minutes':
    default:
      return qty
  }
}

const padZero = (n: number) => (n < 10 ? `0${n}` : `${n}`)

const getInitialDateStrings = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = padZero(now.getMonth() + 1)
  const day = padZero(now.getDate())
  const todayStr = `${year}-${month}-${day}`

  const startHour = now.getHours() + 1
  const startTimeStr = `${padZero(startHour)}:00`
  const endTimeStr = `${padZero(startHour + 1)}:00`

  return {
    startDate: todayStr,
    startTime: startTimeStr,
    endDate: todayStr,
    endTime: endTimeStr,
    deadlineDate: todayStr,
    deadlineTime: '23:59',
  }
}

interface UseEventModalViewModelProps {
  isOpen: boolean
  initialEvent?: CalendarEvent | null
  initialDate?: Date | null
  categories: CalendarCategory[]
  onClose: () => void
  onSaved: () => void
  onOpenCreateCategory?: () => void
}

function toCalendarInstant(value: string, timeZone?: string): string {
  const local = new Date(value)
  if (!timeZone) return Number.isFinite(local.getTime()) ? local.toISOString() : ''
  const target = Date.parse(value + 'Z')
  if (!Number.isFinite(target)) return ''
  const formatter = new Intl.DateTimeFormat('en', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  })
  const candidates = [target - 86400000, target, target + 86400000]
  const asWallTime = (instant: number) => {
    const fields = Object.fromEntries(formatter.formatToParts(instant).map(({ type, value }) => [type, Number(value)]))
    return Date.UTC(fields.year ?? NaN, (fields.month ?? NaN) - 1, fields.day, fields.hour, fields.minute, fields.second)
  }
  const matches = candidates.map((instant) => target - (asWallTime(instant) - instant))
    .filter((instant) => asWallTime(instant) === target)
  return matches.length ? new Date(Math.min(...matches)).toISOString() : ''
}

function formatInstantToWallTime(isoString: string, timeZone: string): { date: string; time: string } | null {
  const d = new Date(isoString)
  if (!Number.isFinite(d.getTime())) return null
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
    const parts = Object.fromEntries(
      formatter.formatToParts(d).map(({ type, value }) => [type, value]),
    )
    return {
      date: `${parts.year}-${parts.month}-${parts.day}`,
      time: `${parts.hour}:${parts.minute}`,
    }
  } catch {
    return null
  }
}

export function useEventModalViewModel({
  isOpen,
  initialEvent,
  initialDate,
  categories,
  onClose,
  onSaved,
}: UseEventModalViewModelProps) {
  const { user } = useAuth()
  const defaults = getInitialDateStrings()

  const isOwner = !initialEvent || !initialEvent.userId || (initialEvent.userId === user?.id)
  const creatorEmail = initialEvent?.creatorEmail || initialEvent?.creator?.email || ''
  const currentGuest = initialEvent?.guests?.find(
    (g) => Boolean(user?.email && g.email.toLowerCase() === user.email.toLowerCase()),
  )
  const isGuest = Boolean(!isOwner && currentGuest)
  const canModify = isOwner || Boolean(currentGuest?.canModify)
  const canInviteOthers = isOwner || Boolean(currentGuest?.canInviteOthers ?? true)
  const canSeeGuestList = isOwner || Boolean(currentGuest?.canSeeGuestList ?? true)

  const [guestStatus, setGuestStatus] = useState<'pending' | 'accepted' | 'declined'>('pending')

  const [entryType, setEntryType] = useState<EntryType>('event')
  const [title, setTitle] = useState('')
  const [calendarId, setCalendarId] = useState<string>('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('')
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false)

  const [availability, setAvailability] = useState<EventAvailability>('busy')
  const [visibility, setVisibility] = useState<EventVisibility>('default')

  const [reminders, setReminders] = useState<ReminderFormItem[]>([
    { id: 'rem-1', method: 'in-app', quantity: 15, unit: 'minutes' },
  ])

  const [recurrenceFreq, setRecurrenceFreq] = useState<RecurrenceFrequency>('none')
  const [isCustomRecurrenceOpen, setIsCustomRecurrenceOpen] = useState(false)
  const [customInterval, setCustomInterval] = useState(1)
  const [customUnit, setCustomUnit] = useState<'day' | 'week' | 'month' | 'year'>('week')
  const [customDaysOfWeek, setCustomDaysOfWeek] = useState<number[]>([1])
  const [customEndCondition, setCustomEndCondition] = useState<'never' | 'until' | 'count'>('never')
  const [customUntilDate, setCustomUntilDate] = useState('')
  const [customCount, setCustomCount] = useState(10)

  const [startDate, setStartDate] = useState(defaults.startDate)
  const [startTime, setStartTime] = useState(defaults.startTime)
  const [endDate, setEndDate] = useState(defaults.endDate)
  const [endTime, setEndTime] = useState(defaults.endTime)
  const [isAllDay, setIsAllDay] = useState(false)
  const [location, setLocation] = useState('')
  const [onlineMeetingUrl, setOnlineMeetingUrl] = useState('')

  const [deadlineDate, setDeadlineDate] = useState(defaults.deadlineDate)
  const [deadlineTime, setDeadlineTime] = useState(defaults.deadlineTime)
  const [priority, setPriority] = useState<EventPriority>('medium')
  const [submissionUrl, setSubmissionUrl] = useState('')
  const [checklist, setChecklist] = useState<SubtaskItem[]>([])
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')

  const [timeZone, setTimeZone] = useState('')
  const [guests, setGuests] = useState<EventGuest[]>([])
  const [newGuestEmail, setNewGuestEmail] = useState('')
  const [guestEmailError, setGuestEmailError] = useState<string | null>(null)
  const [guestCanModify, setGuestCanModify] = useState(false)
  const [guestCanInviteOthers, setGuestCanInviteOthers] = useState(true)
  const [guestCanSeeGuestList, setGuestCanSeeGuestList] = useState(true)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [guestToRemove, setGuestToRemove] = useState<string | null>(null)
  const [deleteRecurringMode, setDeleteRecurringMode] = useState<'this' | 'following' | 'all'>('this')
  const [generalError, setGeneralError] = useState<string | null>(null)

  const isRecurring = Boolean(
    (initialEvent?.recurrence && initialEvent.recurrence.frequency !== 'none') ||
    (initialEvent as unknown as { _isOccurrence?: boolean })?._isOccurrence,
  )

  const lastInitKeyRef = useRef<string | null>(null)

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(() => {
      if (!active) return

      if (!isOpen) {
        lastInitKeyRef.current = null
        setErrors({})
        setGeneralError(null)
        setIsColorPickerOpen(false)
        setIsCustomRecurrenceOpen(false)
        setShowDeleteConfirm(false)
        setShowLeaveConfirm(false)
        setGuestToRemove(null)
        setIsDeleting(false)
        setDeleteRecurringMode('this')
        return
      }

      const baseEventId =
        (initialEvent as unknown as { _baseEventId?: string })?._baseEventId || initialEvent?.id
      const currentInitKey = initialEvent
        ? `edit:${baseEventId}:${initialEvent.updatedAt || ''}`
        : `new:${initialDate ? initialDate.toISOString() : ''}`

      if (lastInitKeyRef.current === currentInitKey) {
        return
      }
      lastInitKeyRef.current = currentInitKey

      if (initialEvent) {
        const start = new Date(initialEvent.startDate)
        const end = new Date(initialEvent.endDate)

        setEntryType(initialEvent.entryType)
        setTitle(initialEvent.title)
        setCalendarId(initialEvent.calendarId ?? '')
        setPriority(initialEvent.priority)
        setDescription(initialEvent.description ?? '')
        setColor(initialEvent.color ?? '')
        setAvailability(initialEvent.availability ?? 'busy')
        setVisibility(initialEvent.visibility ?? 'default')
        setIsAllDay(initialEvent.isAllDay)
        const initialCat = categories.find((c) => c.id === initialEvent.calendarId)
        setTimeZone(initialEvent.timeZone || initialCat?.settings?.timeZone || 'Asia/Ho_Chi_Minh')
        const initialGuests = initialEvent.guests ?? []
        setGuests(initialGuests)
        if (initialGuests.length > 0) {
          setGuestCanModify(initialGuests.some((g) => g.canModify))
          setGuestCanInviteOthers(initialGuests.every((g) => g.canInviteOthers !== false))
          setGuestCanSeeGuestList(initialGuests.every((g) => g.canSeeGuestList !== false))
        } else {
          setGuestCanModify(false)
          setGuestCanInviteOthers(true)
          setGuestCanSeeGuestList(true)
        }
        const foundGuest = initialEvent.guests?.find(
          (g) => Boolean(user?.email && g.email.toLowerCase() === user.email.toLowerCase()),
        )
        setGuestStatus(foundGuest?.status || 'pending')
        setNewGuestEmail('')
        setGuestEmailError(null)

        setStartDate(`${start.getFullYear()}-${padZero(start.getMonth() + 1)}-${padZero(start.getDate())}`)
        setStartTime(`${padZero(start.getHours())}:${padZero(start.getMinutes())}`)
        setEndDate(`${end.getFullYear()}-${padZero(end.getMonth() + 1)}-${padZero(end.getDate())}`)
        setEndTime(`${padZero(end.getHours())}:${padZero(end.getMinutes())}`)

        setDeadlineDate(`${end.getFullYear()}-${padZero(end.getMonth() + 1)}-${padZero(end.getDate())}`)
        setDeadlineTime(`${padZero(end.getHours())}:${padZero(end.getMinutes())}`)

        setLocation(initialEvent.location ?? '')
        setOnlineMeetingUrl(initialEvent.onlineMeetingUrl ?? '')
        setSubmissionUrl(initialEvent.submissionUrl ?? '')
        setChecklist(initialEvent.checklist ?? [])

        if (initialEvent.reminders && initialEvent.reminders.length > 0) {
          setReminders(
            initialEvent.reminders.map((r, idx) => {
              const converted = minutesToReminderForm(r.minutesBefore)
              return {
                id: `rem-${idx}-${Date.now()}`,
                method: r.method,
                quantity: converted.quantity,
                unit: converted.unit,
              }
            }),
          )
        } else {
          setReminders([
            {
              id: 'rem-1',
              method: 'in-app',
              quantity: initialEvent.entryType === 'task' ? 1 : 15,
              unit: initialEvent.entryType === 'task' ? 'hours' : 'minutes',
            },
          ])
        }

        if (initialEvent.recurrence) {
          const freq = initialEvent.recurrence.frequency
          const isCustom = freq === 'custom' || initialEvent.recurrence.interval > 1
            || Boolean(initialEvent.recurrence.until || initialEvent.recurrence.count)
          setRecurrenceFreq(isCustom ? 'custom' : freq)
          setCustomUnit(freq === 'daily' ? 'day' : freq === 'monthly' ? 'month' : freq === 'yearly' ? 'year' : 'week')
          setCustomInterval(initialEvent.recurrence.interval || 1)
          if (initialEvent.recurrence.daysOfWeek && initialEvent.recurrence.daysOfWeek.length > 0) {
            setCustomDaysOfWeek(initialEvent.recurrence.daysOfWeek)
          }
          if (initialEvent.recurrence.until) {
            const untilD = new Date(initialEvent.recurrence.until)
            setCustomEndCondition('until')
            setCustomUntilDate(
              `${untilD.getFullYear()}-${padZero(untilD.getMonth() + 1)}-${padZero(untilD.getDate())}`,
            )
          } else if (initialEvent.recurrence.count) {
            setCustomEndCondition('count')
            setCustomCount(initialEvent.recurrence.count)
          } else {
            setCustomEndCondition('never')
          }
        } else {
          setRecurrenceFreq('none')
        }
      } else {
        const def = getInitialDateStrings()
        if (initialDate) {
          const y = initialDate.getFullYear()
          const m = padZero(initialDate.getMonth() + 1)
          const d = padZero(initialDate.getDate())
          def.startDate = `${y}-${m}-${d}`
          def.endDate = `${y}-${m}-${d}`
          def.deadlineDate = `${y}-${m}-${d}`
          if (initialDate.getHours() !== 0 || initialDate.getMinutes() !== 0) {
            const h = padZero(initialDate.getHours())
            const nextHour = initialDate.getHours() + 1
            const endH = padZero(nextHour > 23 ? 23 : nextHour)
            def.startTime = `${h}:00`
            def.endTime = `${endH}:00`
          }
        }

        setEntryType('event')
        setTitle('')
        const defaultCalendar = categories[0]
        setCalendarId(defaultCalendar?.id ?? '')
        setPriority('medium')
        setStartDate(def.startDate)
        setStartTime(def.startTime)
        if (defaultCalendar?.settings) {
          const end = new Date(new Date(def.startDate + 'T' + def.startTime).getTime() + defaultCalendar.settings.defaultDurationMinutes * 60000)
          setEndDate([end.getFullYear(), padZero(end.getMonth() + 1), padZero(end.getDate())].join('-'))
          setEndTime([padZero(end.getHours()), padZero(end.getMinutes())].join(':'))
        } else {
          setEndDate(def.endDate)
          setEndTime(def.endTime)
        }
        setDeadlineDate(def.deadlineDate)
        setDeadlineTime(def.deadlineTime)
        setIsAllDay(false)
        setLocation('')
        setOnlineMeetingUrl('')
        setSubmissionUrl('')
        setDescription('')
        setColor('')
        setAvailability('busy')
        setVisibility('default')
        setTimeZone(defaultCalendar?.settings?.timeZone || 'Asia/Ho_Chi_Minh')
        setGuests([])
        setGuestStatus('pending')
        setNewGuestEmail('')
        setGuestEmailError(null)
        setGuestCanModify(false)
        setGuestCanInviteOthers(true)
        setGuestCanSeeGuestList(true)
        setChecklist([])
        setNewSubtaskTitle('')
        setRecurrenceFreq('none')
        setReminders(defaultCalendar?.settings?.reminders.map((reminder, index) => ({
          id: 'calendar-reminder-' + index,
          method: reminder.method,
          ...minutesToReminderForm(reminder.minutesBefore),
        })) ?? [{ id: 'rem-1', method: 'in-app', quantity: 15, unit: 'minutes' }])
      }
      setErrors({})
      setGeneralError(null)
      setIsColorPickerOpen(false)
      setIsCustomRecurrenceOpen(false)
      setShowDeleteConfirm(false)
      setIsDeleting(false)
      setDeleteRecurringMode('this')
    }, 0)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [isOpen, initialEvent, initialDate, categories, user?.email])

  const clearError = (field: string) => {
    setErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const handleTabChange = (nextType: EntryType) => {
    setEntryType(nextType)
    clearError('entryType')
    if (nextType === 'task' && reminders.length === 0) {
      setReminders([{ id: 'rem-task-default', method: 'in-app', quantity: 1, unit: 'hours' }])
    }
  }

  const handleCalendarSelect = (id: string) => {
    setCalendarId(id)
    clearError('calendarId')
    const newCategory = categories.find((category) => category.id === id)
    if (newCategory) {
      setColor(newCategory.color || '')
    }
    const settings = newCategory?.settings
    if (settings?.timeZone && !initialEvent) {
      setTimeZone(settings.timeZone)
    }
    if (!settings || initialEvent) return
    setReminders(settings.reminders.map((reminder, index) => ({
      id: 'calendar-reminder-' + index,
      method: reminder.method,
      ...minutesToReminderForm(reminder.minutesBefore),
    })))
    if (entryType === 'event') {
      const end = new Date(new Date(startDate + 'T' + startTime).getTime() + settings.defaultDurationMinutes * 60000)
      if (!Number.isFinite(end.getTime())) return
      setEndDate([end.getFullYear(), padZero(end.getMonth() + 1), padZero(end.getDate())].join('-'))
      setEndTime([padZero(end.getHours()), padZero(end.getMinutes())].join(':'))
    }
  }

  const handleTimeZoneChange = (newTz: string) => {
    const oldTz = timeZone || selectedCategory?.settings?.timeZone || 'Asia/Ho_Chi_Minh'
    setTimeZone(newTz)
    if (!newTz || newTz === oldTz) return

    if (startDate && startTime) {
      const startIso = toCalendarInstant(`${startDate}T${startTime}:00`, oldTz)
      if (startIso) {
        const converted = formatInstantToWallTime(startIso, newTz)
        if (converted) {
          setStartDate(converted.date)
          setStartTime(converted.time)
        }
      }
    }

    if (endDate && endTime) {
      const endIso = toCalendarInstant(`${endDate}T${endTime}:00`, oldTz)
      if (endIso) {
        const converted = formatInstantToWallTime(endIso, newTz)
        if (converted) {
          setEndDate(converted.date)
          setEndTime(converted.time)
        }
      }
    }

    if (deadlineDate && deadlineTime) {
      const deadlineIso = toCalendarInstant(`${deadlineDate}T${deadlineTime}:00`, oldTz)
      if (deadlineIso) {
        const converted = formatInstantToWallTime(deadlineIso, newTz)
        if (converted) {
          setDeadlineDate(converted.date)
          setDeadlineTime(converted.time)
        }
      }
    }
  }

  const handleAddGuest = () => {
    const trimmed = newGuestEmail.trim().toLowerCase()
    if (!trimmed) return
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const usernameRegex = /^[a-zA-Z0-9._-]{3,40}$/
    if (!emailRegex.test(trimmed) && !usernameRegex.test(trimmed)) {
      setGuestEmailError('Vui lòng nhập email hoặc username hợp lệ')
      return
    }
    if (user?.email && trimmed === user.email.toLowerCase()) {
      setGuestEmailError('Bạn không thể tự mời chính mình')
      return
    }
    if (creatorEmail && trimmed === creatorEmail.trim().toLowerCase()) {
      setGuestEmailError('Không thể mời lại người tạo sự kiện')
      return
    }
    if (!isOwner && initialEvent?.creator?.email && trimmed === initialEvent.creator.email.trim().toLowerCase()) {
      setGuestEmailError('Không thể mời lại người tạo sự kiện')
      return
    }
    if (guests.some((g) => g.email.trim().toLowerCase() === trimmed)) {
      setGuestEmailError('Khách này đã được thêm vào danh sách')
      return
    }
    const newGuest: EventGuest = {
      email: trimmed,
      role: isOwner && guestCanModify ? 'editor' : 'viewer',
      canModify: isOwner ? guestCanModify : false,
      canInviteOthers: guestCanInviteOthers,
      canSeeGuestList: guestCanSeeGuestList,
      status: 'pending',
    }
    setGuests((prev) => [...prev, newGuest])
    setNewGuestEmail('')
    setGuestEmailError(null)
  }

  const handleToggleAllGuestCanModify = (checked: boolean) => {
    setGuestCanModify(checked)
    setGuests((prev) =>
      prev.map((g) => ({
        ...g,
        canModify: checked,
        role: checked ? 'editor' : 'viewer',
      })),
    )
  }

  const handleToggleAllGuestCanInviteOthers = (checked: boolean) => {
    setGuestCanInviteOthers(checked)
    setGuests((prev) =>
      prev.map((g) => ({
        ...g,
        canInviteOthers: checked,
      })),
    )
  }

  const handleToggleAllGuestCanSeeGuestList = (checked: boolean) => {
    setGuestCanSeeGuestList(checked)
    setGuests((prev) =>
      prev.map((g) => ({
        ...g,
        canSeeGuestList: checked,
      })),
    )
  }

  const handleToggleGuestCanModify = (email: string) => {
    setGuests((prev) =>
      prev.map((g) => {
        if (g.email.trim().toLowerCase() === email.trim().toLowerCase()) {
          const nextCanModify = !g.canModify
          return {
            ...g,
            canModify: nextCanModify,
            role: nextCanModify ? 'editor' : 'viewer',
          }
        }
        return g
      }),
    )
  }

  const handleRemoveGuest = (email: string) => {
    setGuests((prev) => prev.filter((g) => g.email !== email))
  }

  const handleRequestRemoveGuest = (email: string) => {
    setGuestToRemove(email)
  }

  const handleConfirmRemoveGuest = () => {
    if (guestToRemove) {
      handleRemoveGuest(guestToRemove)
      setGuestToRemove(null)
    }
  }

  const handleCancelRemoveGuest = () => {
    setGuestToRemove(null)
  }

  const handleConfirmLeaveEvent = async () => {
    setShowLeaveConfirm(false)
    await handleLeaveEvent()
  }

  const handleRespondInvite = async (status: 'accepted' | 'declined') => {
    if (!initialEvent) return
    try {
      setIsSubmitting(true)
      const realEventId =
        (initialEvent as unknown as { _baseEventId?: string })._baseEventId || initialEvent.id
      await calendarApi.respondInvite(realEventId, status)
      setGuestStatus(status)
      setGuests((prev) =>
        prev.map((g) =>
          user?.email && g.email.toLowerCase() === user.email.toLowerCase()
            ? { ...g, status }
            : g,
        ),
      )
      onSaved()
      window.dispatchEvent(new CustomEvent('edutrack-calendar-refresh'))
    } catch (err) {
      setGeneralError(err instanceof Error ? err.message : 'Không thể phản hồi lời mời')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLeaveEvent = async () => {
    if (!initialEvent) return
    try {
      setIsDeleting(true)
      const realEventId =
        (initialEvent as unknown as { _baseEventId?: string })._baseEventId || initialEvent.id
      await calendarApi.leaveEvent(realEventId)
      onSaved()
      window.dispatchEvent(new CustomEvent('edutrack-calendar-refresh'))
      onClose()
    } catch (err) {
      setGeneralError(err instanceof Error ? err.message : 'Không thể rời sự kiện')
    } finally {
      setIsDeleting(false)
    }
  }

  const selectedCategory = categories.find((c) => c.id === calendarId)
  const activeColor = color || selectedCategory?.color || '#2563EB'

  const handleAddReminder = () => {
    const newRem: ReminderFormItem = {
      id: `rem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      method: 'in-app',
      quantity: 10,
      unit: 'minutes',
    }
    setReminders((prev) => [...prev, newRem])
  }

  const handleRemoveReminder = (id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id))
  }

  const handleUpdateReminder = (
    id: string,
    field: 'method' | 'quantity' | 'unit',
    value: ReminderMethod | number | ReminderUnit,
  ) => {
    setReminders((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r
        return { ...r, [field]: value }
      }),
    )
  }

  const handleAddSubtask = () => {
    const text = newSubtaskTitle.trim()
    if (!text) return
    const newItem: SubtaskItem = {
      id: `step-${Date.now()}`,
      title: text,
      isCompleted: false,
    }
    setChecklist((prev) => [...prev, newItem])
    setNewSubtaskTitle('')
  }

  const handleToggleSubtask = (subtaskId: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === subtaskId ? { ...item, isCompleted: !item.isCompleted } : item)),
    )
  }

  const handleRemoveSubtask = (subtaskId: string) => {
    setChecklist((prev) => prev.filter((item) => item.id !== subtaskId))
  }

  const handleSelectRecurrence = (freq: RecurrenceFrequency) => {
    if (freq === 'custom') {
      setIsCustomRecurrenceOpen(true)
    } else {
      setRecurrenceFreq(freq)
      setIsCustomRecurrenceOpen(false)
    }
  }

  const handleToggleCustomDay = (day: number) => {
    setCustomDaysOfWeek((prev) => {
      if (prev.includes(day)) {
        if (prev.length === 1) return prev
        return prev.filter((d) => d !== day)
      }
      return [...prev, day].sort()
    })
  }

  const handleConfirmCustomRecurrence = () => {
    setRecurrenceFreq('custom')
    setIsCustomRecurrenceOpen(false)
  }

  const handleCancelCustomRecurrence = () => {
    setIsCustomRecurrenceOpen(false)
  }

  const getRecurrenceLabel = (): string => {
    switch (recurrenceFreq) {
      case 'none':
        return 'Không lặp lại'
      case 'daily':
        return 'Hàng ngày'
      case 'weekly':
        return 'Hàng tuần'
      case 'monthly':
        return 'Hàng tháng'
      case 'yearly':
        return 'Hàng năm'
      case 'weekdays':
        return 'Mọi ngày trong tuần (T2 - T6)'
      case 'custom': {
        const unitMap: Record<string, string> = {
          day: 'ngày',
          week: 'tuần',
          month: 'tháng',
          year: 'năm',
        }
        const unitStr = unitMap[customUnit] || 'tuần'
        if (customUnit === 'week') {
          const dayMap: Record<number, string> = {
            1: 'T2',
            2: 'T3',
            3: 'T4',
            4: 'T5',
            5: 'T6',
            6: 'T7',
            0: 'CN',
          }
          const daysStr = customDaysOfWeek.map((d) => dayMap[d]).join(', ')
          return `Mỗi ${customInterval} ${unitStr} vào ${daysStr}`
        }
        return `Mỗi ${customInterval} ${unitStr}`
      }
      default:
        return 'Không lặp lại'
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setGeneralError(null)

    const activeTimeZone = timeZone || selectedCategory?.settings?.timeZone || 'Asia/Ho_Chi_Minh'
    let startIso: string
    let endIso: string

    if (entryType === 'task') {
      if (isAllDay) {
        startIso = toCalendarInstant(`${deadlineDate}T00:00:00`, activeTimeZone)
        endIso = toCalendarInstant(`${deadlineDate}T23:59:59`, activeTimeZone)
      } else {
        startIso = toCalendarInstant(`${deadlineDate}T${deadlineTime}:00`, activeTimeZone)
        endIso = toCalendarInstant(`${deadlineDate}T${deadlineTime}:00`, activeTimeZone)
      }
    } else {
      if (isAllDay) {
        startIso = toCalendarInstant(`${startDate}T00:00:00`, activeTimeZone)
        endIso = toCalendarInstant(`${endDate}T23:59:59`, activeTimeZone)
      } else {
        startIso = toCalendarInstant(`${startDate}T${startTime}:00`, activeTimeZone)
        endIso = toCalendarInstant(`${endDate}T${endTime}:00`, activeTimeZone)
      }
    }

    const convertedReminders: ReminderItem[] = reminders.map((r) => ({
      method: r.method,
      minutesBefore: reminderFormToMinutes(r.quantity, r.unit),
    }))

    let recurrencePayload: RecurrenceConfig = { frequency: 'none', interval: 1 }
    if (entryType === 'event' && recurrenceFreq !== 'none') {
      if (recurrenceFreq === 'custom') {
        recurrencePayload = {
          frequency: { day: 'daily', week: 'custom', month: 'monthly', year: 'yearly' }[customUnit] as RecurrenceFrequency,
          interval: customInterval,
          daysOfWeek: customUnit === 'week' ? customDaysOfWeek : undefined,
          until: customEndCondition === 'until' && customUntilDate
            ? new Date(customUntilDate + 'T23:59:59.999').toISOString()
            : null,
          count: customEndCondition === 'count' ? customCount : null,
        }
      } else if (recurrenceFreq === 'weekdays') {
        recurrencePayload = {
          frequency: 'weekdays',
          interval: 1,
          daysOfWeek: [1, 2, 3, 4, 5],
        }
      } else {
        recurrencePayload = {
          frequency: recurrenceFreq,
          interval: 1,
        }
      }
    }

    const submissionGuests = [...guests]
    const pendingGuestInput = newGuestEmail.trim().toLowerCase()
    if (pendingGuestInput) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      const usernameRegex = /^[a-zA-Z0-9._-]{3,40}$/
      if (emailRegex.test(pendingGuestInput) || usernameRegex.test(pendingGuestInput)) {
        if (
          (!user?.email || pendingGuestInput !== user.email.toLowerCase()) &&
          (!creatorEmail || pendingGuestInput !== creatorEmail.toLowerCase()) &&
          !submissionGuests.some((g) => g.email.toLowerCase() === pendingGuestInput)
        ) {
          submissionGuests.push({
            email: pendingGuestInput,
            role: isOwner && guestCanModify ? 'editor' : 'viewer',
            canModify: isOwner ? guestCanModify : false,
            canInviteOthers: guestCanInviteOthers,
            canSeeGuestList: guestCanSeeGuestList,
            status: 'pending',
          })
          setGuests(submissionGuests)
          setNewGuestEmail('')
        }
      }
    }

    const payload: CreateEventInput = {
      title,
      entryType,
      priority,
      startDate: startIso,
      endDate: endIso,
      isAllDay,
      calendarId: calendarId || null,
      location: entryType === 'event' ? location : '',
      onlineMeetingUrl: entryType === 'event' ? onlineMeetingUrl : '',
      submissionUrl: entryType === 'task' ? submissionUrl : '',
      description,
      color,
      availability,
      visibility,
      timeZone: activeTimeZone,
      guests: submissionGuests,
      checklist: entryType === 'task' ? checklist : [],
      reminders: convertedReminders,
      recurrence: recurrencePayload,
    }

    const validationErrors = validateEventForm(payload)
    if (entryType === 'event' && recurrenceFreq === 'custom' && (
      !Number.isInteger(customInterval) || customInterval < 1 || customInterval > 99
      || (customUnit === 'week' && customDaysOfWeek.length === 0)
      || (customEndCondition === 'count' && (!Number.isInteger(customCount) || customCount < 1 || customCount > 365))
      || (customEndCondition === 'until' && (!recurrencePayload.until || recurrencePayload.until < startIso))
    )) {
      validationErrors.recurrence = 'Quy tắc lặp lại không hợp lệ. Kiểm tra chu kỳ (1–99), ngày kết thúc và số lần lặp (1–365).'
    }
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    try {
      setIsSubmitting(true)
      if (initialEvent) {
        const realEventId =
          (initialEvent as unknown as { _baseEventId?: string })._baseEventId || initialEvent.id
        await calendarApi.updateEvent(realEventId, payload)
      } else {
        await calendarApi.createEvent(payload)
      }
      onSaved()
      window.dispatchEvent(new CustomEvent('edutrack-calendar-refresh'))
      onClose()
    } catch (err: unknown) {
      const maybeErr = err as { fieldErrors?: Record<string, string>; message?: string }
      if (maybeErr.fieldErrors) {
        setErrors(maybeErr.fieldErrors)
      } else {
        setGeneralError(maybeErr.message || 'Đã có lỗi xảy ra khi lưu.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteEvent = async () => {
    if (!initialEvent) return
    try {
      setIsDeleting(true)
      setGeneralError(null)

      const realEventId =
        (initialEvent as unknown as { _baseEventId?: string })._baseEventId || initialEvent.id
      const targetDate = initialEvent.startDate

      if (isRecurring) {
        await calendarApi.deleteEvent(realEventId, deleteRecurringMode, targetDate)
      } else {
        await calendarApi.deleteEvent(realEventId, 'all')
      }

      onSaved()
      onClose()
    } catch (err: unknown) {
      const maybeErr = err as { message?: string }
      setGeneralError(maybeErr.message || 'Không thể xóa sự kiện. Vui lòng thử lại.')
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  return {
    entryType,
    handleTabChange,
    title,
    setTitle: (val: string) => { setTitle(val); clearError('title') },
    calendarId,
    handleCalendarSelect,
    priority,
    setPriority,
    description,
    setDescription: (val: string) => { setDescription(val); clearError('description') },
    color,
    setColor,
    activeColor,
    timeZone,
    setTimeZone,
    handleTimeZoneChange,
    guests,
    newGuestEmail,
    setNewGuestEmail,
    creatorEmail,
    guestEmailError,
    guestCanModify,
    setGuestCanModify,
    guestCanInviteOthers,
    setGuestCanInviteOthers,
    guestCanSeeGuestList,
    setGuestCanSeeGuestList,
    handleToggleAllGuestCanModify,
    handleToggleAllGuestCanInviteOthers,
    handleToggleAllGuestCanSeeGuestList,
    handleToggleGuestCanModify,
    handleAddGuest,
    handleRemoveGuest,
    inputTimeZone: timeZone,
    isColorPickerOpen,
    setIsColorPickerOpen,
    availability,
    setAvailability,
    visibility,
    setVisibility,
    reminders,
    handleAddReminder,
    handleRemoveReminder,
    handleUpdateReminder,
    recurrenceFreq,
    handleSelectRecurrence,
    isCustomRecurrenceOpen,
    setIsCustomRecurrenceOpen,
    customInterval,
    setCustomInterval,
    customUnit,
    setCustomUnit,
    customDaysOfWeek,
    handleToggleCustomDay,
    customEndCondition,
    setCustomEndCondition,
    customUntilDate,
    setCustomUntilDate,
    customCount,
    setCustomCount,
    handleConfirmCustomRecurrence,
    handleCancelCustomRecurrence,
    getRecurrenceLabel,
    startDate,
    setStartDate: (val: string) => { setStartDate(val); clearError('startDate') },
    startTime,
    setStartTime: (val: string) => { setStartTime(val); clearError('startDate') },
    endDate,
    setEndDate: (val: string) => { setEndDate(val); clearError('endDate') },
    endTime,
    setEndTime: (val: string) => { setEndTime(val); clearError('endDate') },
    isAllDay,
    setIsAllDay,
    location,
    setLocation: (val: string) => { setLocation(val); clearError('location') },
    onlineMeetingUrl,
    setOnlineMeetingUrl: (val: string) => { setOnlineMeetingUrl(val); clearError('onlineMeetingUrl') },
    deadlineDate,
    setDeadlineDate: (val: string) => { setDeadlineDate(val); clearError('endDate') },
    deadlineTime,
    setDeadlineTime: (val: string) => { setDeadlineTime(val); clearError('endDate') },
    submissionUrl,
    setSubmissionUrl: (val: string) => { setSubmissionUrl(val); clearError('submissionUrl') },
    checklist,
    newSubtaskTitle,
    setNewSubtaskTitle,
    handleAddSubtask,
    handleToggleSubtask,
    handleRemoveSubtask,
    errors,
    isSubmitting,
    isDeleting,
    isRecurring,
    deleteRecurringMode,
    setDeleteRecurringMode,
    showDeleteConfirm,
    setShowDeleteConfirm,
    handleDeleteEvent,
    showLeaveConfirm,
    setShowLeaveConfirm,
    guestToRemove,
    handleRequestRemoveGuest,
    handleConfirmRemoveGuest,
    handleCancelRemoveGuest,
    handleConfirmLeaveEvent,
    generalError,
    handleSubmit,
    isOwner,
    isGuest,
    currentGuest,
    guestStatus,
    setGuestStatus,
    canModify,
    canInviteOthers,
    canSeeGuestList,
    handleRespondInvite,
    handleLeaveEvent,
  }
}

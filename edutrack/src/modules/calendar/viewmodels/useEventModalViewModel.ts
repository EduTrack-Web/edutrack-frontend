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
import {
  validateChecklistStep,
  validateCustomRecurrence,
  validateEventForm,
  validateEventTitle,
  validateGuestInput,
} from '../models/calendarValidation'
import { PRIORITY_CONFIG } from '../models/calendarConstants'
import { calendarApi } from '../services/calendarApi'
import { useRecurringConfirmation } from './useRecurringConfirmation'
import { useAuth } from '@/modules/auth/viewmodels/useAuth'

export const GOOGLE_CALENDAR_EVENT_COLORS = [
  { id: '1', label: 'Oải hương', hex: '#7986CB' },
  { id: '2', label: 'Xô thơm', hex: '#33B679' },
  { id: '3', label: 'Nho', hex: '#8E24AA' },
  { id: '4', label: 'Hồng hạc', hex: '#E67C73' },
  { id: '5', label: 'Chuối', hex: '#F6BF26' },
  { id: '6', label: 'Quýt', hex: '#F4511E' },
  { id: '7', label: 'Khổng tước', hex: '#039BE5' },
  { id: '8', label: 'Than chì', hex: '#616161' },
  { id: '9', label: 'Việt quất', hex: '#3F51B5' },
  { id: '10', label: 'Húng quế', hex: '#0B8043' },
  { id: '11', label: 'Cà chua', hex: '#D50000' },
] as const

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

export interface EventColorOption {
  hex: string
  label?: string
}

export const UNIFIED_EVENT_COLORS: readonly EventColorOption[] = (() => {
  const seen = new Set<string>()
  const merged: EventColorOption[] = []

  for (const hex of EXTENDED_CALENDAR_COLORS) {
    const key = hex.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      merged.push({ hex })
    }
  }

  for (const item of GOOGLE_CALENDAR_EVENT_COLORS) {
    const key = item.hex.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      merged.push({ hex: item.hex, label: item.label })
    }
  }

  return merged
})()

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

function serializeEventTime(
  date: string, time: string, zone: string, original?: string | null, allDay = false,
): string {
  // The form has minute precision. Keep seconds and the original DST offset on unrelated edits.
  const wall = original ? formatInstantToWallTime(original, zone) : null
  if (original && wall?.date === date && (allDay || wall.time === time.slice(0, 5))) return original
  return toCalendarInstant(`${date}T${time}`, zone)
}

export function useEventModalViewModel({
  isOpen,
  initialEvent,
  initialDate,
  categories,
  onClose,
  onSaved,
}: UseEventModalViewModelProps) {
  const { confirmation, confirmRecurring } = useRecurringConfirmation()
  const { user } = useAuth()
  const defaults = getInitialDateStrings()

  const isOwner = !initialEvent || !initialEvent.userId || (initialEvent.userId === user?.id)
  const creatorEmail = initialEvent?.creatorEmail || initialEvent?.creator?.email || ''
  const currentGuest = initialEvent?.guests?.find(
    (g) => Boolean(user?.email && g.email.toLowerCase() === user.email.toLowerCase()),
  )
  const isGuest = Boolean(!isOwner && currentGuest)
  const isGoogleReadOnly = Boolean(initialEvent?.isGoogleReadOnly)
  const isGoogleLinked = Boolean(
    initialEvent?.syncOrigin === 'google' ||
      initialEvent?.hasGoogleMappings ||
      initialEvent?.googleSource,
  )
  const canModify = (isOwner || Boolean(currentGuest?.canModify)) && !isGoogleReadOnly
  const canInviteOthers = (isOwner || Boolean(currentGuest?.canInviteOthers ?? true)) && !isGoogleReadOnly
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
  const [hasDeadline, setHasDeadline] = useState(false)
  const [pendingRecurrence, setPendingRecurrence] = useState<RecurrenceFrequency | null>(null)
  const [isCompleted, setIsCompleted] = useState(false)
  const [showPriorityConfirmDialog, setShowPriorityConfirmDialog] = useState(false)
  const [pendingPriority, setPendingPriority] = useState<EventPriority | null>(null)
  const [priority, setPriority] = useState<EventPriority>('medium')
  const [showEditScopeModal, setShowEditScopeModal] = useState(false)
  const [pendingSavePayload, setPendingSavePayload] = useState<CreateEventInput | null>(null)
  const [submissionUrl, setSubmissionUrl] = useState('')
  const [checklist, setChecklist] = useState<SubtaskItem[]>([])
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')

  const [timeZone, setTimeZone] = useState('')
  const [guests, setGuests] = useState<EventGuest[]>([])
  const [newGuestEmail, setNewGuestEmail] = useState('')
  const [guestEmailError, setGuestEmailError] = useState<string | null>(null)
  const [customRecurrenceError, setCustomRecurrenceError] = useState<string | null>(null)
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
        ? `edit:${baseEventId}:${initialDate ? initialDate.toISOString() : ''}:${initialEvent.updatedAt || ''}`
        : `new:${initialDate ? initialDate.toISOString() : ''}`

      if (lastInitKeyRef.current === currentInitKey) {
        return
      }
      lastInitKeyRef.current = currentInitKey

      if (initialEvent) {
        const initialCat = categories.find((c) => c.id === initialEvent.calendarId)
        const zone = initialEvent.timeZone || initialCat?.settings?.timeZone || 'Asia/Ho_Chi_Minh'
        const baseStartMs = new Date(initialEvent.startDate).getTime()
        const baseEndMs = new Date(initialEvent.endDate).getTime()
        const durationMs = Math.max(0, baseEndMs - baseStartMs)
        const effectiveStartIso = initialDate ? initialDate.toISOString() : initialEvent.startDate
        const effectiveEndIso = initialDate
          ? new Date(initialDate.getTime() + durationMs).toISOString()
          : initialEvent.endDate
        const start = formatInstantToWallTime(effectiveStartIso, zone)
        const end = formatInstantToWallTime(effectiveEndIso, zone)

        setEntryType(initialEvent.entryType)
        setTitle(initialEvent.title)
        setCalendarId(initialEvent.calendarId ?? '')
        setPriority(initialEvent.priority)
        setDescription(initialEvent.description ?? '')
        setColor(initialEvent.inheritsCalendarColor ? '' : initialEvent.color ?? '')
        setAvailability(initialEvent.availability ?? 'busy')
        setVisibility(initialEvent.visibility ?? 'default')
        setIsAllDay(initialEvent.isAllDay)
        setTimeZone(zone)
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

        setStartDate(start?.date ?? '')
        setStartTime(start?.time ?? '')
        setEndDate(end?.date ?? '')
        setEndTime(end?.time ?? '')
        setIsCompleted(Boolean(initialEvent.isCompleted))

        if (initialEvent.deadline) {
          const dl = formatInstantToWallTime(initialEvent.deadline, zone)
          setDeadlineDate(dl?.date ?? '')
          setDeadlineTime(dl?.time ?? '')
          setHasDeadline(true)
        } else {
          setDeadlineDate(end?.date ?? '')
          setDeadlineTime(end?.time ?? '')
          setHasDeadline(initialEvent.entryType === 'task')
        }

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
        setHasDeadline(false)
        setIsCompleted(false)
        setShowPriorityConfirmDialog(false)
        setPendingPriority(null)
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
      setShowEditScopeModal(false)
      setPendingSavePayload(null)
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
    if (initialEvent) return
    setEntryType(nextType)
    clearError('entryType')
    if (nextType === 'task') {
      setHasDeadline(false)
      setCalendarId('')
      const config = PRIORITY_CONFIG[priority]
      if (config) {
        setColor(config.color)
        setReminders(
          config.defaultReminders.map((r, idx) => ({
            id: `rem-p-${idx}-${Date.now()}`,
            method: r.method,
            quantity: r.quantity,
            unit: r.unit,
          })),
        )
      }
    } else {
      if (!calendarId && categories.length > 0) {
        const firstCat = categories[0]
        if (firstCat) {
          setCalendarId(firstCat.id)
          setColor('')
        }
      }
    }
  }

  const handleCalendarSelect = (id: string) => {
    setCalendarId(id)
    clearError('calendarId')
    if (!id) {
      if (entryType === 'task') {
        const config = PRIORITY_CONFIG[priority]
        if (config) setColor(config.color)
      }
      return
    }
    const newCategory = categories.find((category) => category.id === id)
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
    const error = validateGuestInput(
      newGuestEmail,
      guests,
      user?.email,
      creatorEmail || initialEvent?.creator?.email,
      true,
    )
    if (error) {
      setGuestEmailError(error)
      return
    }
    const trimmed = newGuestEmail.trim().toLowerCase()
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
    if (isRecurring && !await confirmRecurring(status, initialEvent.entryType, initialEvent.title)) return
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
  const activeColor =
    color ||
    (entryType === 'task'
      ? PRIORITY_CONFIG[priority]?.color || '#3B82F6'
      : initialEvent?.googleSource?.calendarColor ||
        selectedCategory?.color ||
        (initialEvent?.calendarId === calendarId && initialEvent?.calendar?.color) ||
        '#2563EB')

  const handleSelectPriority = (newPriority: EventPriority) => {
    if (newPriority === priority) return
    if (entryType === 'task') {
      setPendingPriority(newPriority)
      setShowPriorityConfirmDialog(true)
    } else {
      setPriority(newPriority)
    }
  }

  const handleApplyPriorityConfig = () => {
    if (!pendingPriority) return
    setPriority(pendingPriority)
    const config = PRIORITY_CONFIG[pendingPriority]
    if (config) {
      setColor(config.color)
      setReminders(
        config.defaultReminders.map((r, idx) => ({
          id: `rem-p-${idx}-${Date.now()}`,
          method: r.method,
          quantity: r.quantity,
          unit: r.unit,
        })),
      )
    }
    setShowPriorityConfirmDialog(false)
    setPendingPriority(null)
  }

  const handleKeepCurrentConfig = () => {
    if (!pendingPriority) return
    setPriority(pendingPriority)
    setShowPriorityConfirmDialog(false)
    setPendingPriority(null)
  }

  const checklistCompletedCount = checklist.filter((i) => i.isCompleted).length
  const checklistTotalCount = checklist.length
  const checklistProgressPercent =
    checklistTotalCount > 0 ? Math.round((checklistCompletedCount / checklistTotalCount) * 100) : 0

  const handleToggleComplete = (): boolean => {
    const titleError = isCompleted ? undefined : validateEventTitle(title)
    if (titleError) {
      setErrors((prev) => ({ ...prev, title: titleError }))
      return false
    }
    setIsCompleted((prev) => !prev)
    return true
  }

  const handleAddReminder = () => {
    if (reminders.length >= 10) {
      setErrors((prev) => ({ ...prev, reminders: 'Tối đa 10 mốc thông báo cho mỗi sự kiện / nhiệm vụ' }))
      return
    }
    const newRem: ReminderFormItem = {
      id: `rem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      method: 'in-app',
      quantity: 10,
      unit: 'minutes',
    }
    setReminders((prev) => [...prev, newRem])
    clearError('reminders')
  }

  const handleRemoveReminder = (id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id))
    clearError('reminders')
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
    clearError('reminders')
  }

  const handleAddSubtask = () => {
    const text = newSubtaskTitle.trim()
    const stepError = validateChecklistStep(text, checklist)
    if (stepError) {
      setErrors((prev) => ({ ...prev, checklist: stepError }))
      return
    }
    const newItem: SubtaskItem = {
      id: `step-${Date.now()}`,
      title: text,
      isCompleted: false,
    }
    setChecklist((prev) => [...prev, newItem])
    setNewSubtaskTitle('')
    clearError('checklist')
  }

  const handleToggleSubtask = (subtaskId: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === subtaskId ? { ...item, isCompleted: !item.isCompleted } : item)),
    )
  }

  const handleRemoveSubtask = (subtaskId: string) => {
    setChecklist((prev) => prev.filter((item) => item.id !== subtaskId))
    clearError('checklist')
  }

  const handleSelectRecurrence = (freq: RecurrenceFrequency) => {
    if (freq !== 'none' && entryType === 'task' && hasDeadline) {
      setPendingRecurrence(freq)
      return
    }
    applyRecurrence(freq)
  }

  const applyRecurrence = (freq: RecurrenceFrequency) => {
    if (freq === 'custom') {
      setIsCustomRecurrenceOpen(true)
    } else {
      setRecurrenceFreq(freq)
      setIsCustomRecurrenceOpen(false)
    }
  }

  const handleConfirmRecurrenceWithoutDeadline = () => {
    if (!pendingRecurrence) return
    setHasDeadline(false)
    applyRecurrence(pendingRecurrence)
    setPendingRecurrence(null)
  }

  const handleCancelRecurrenceChange = () => {
    setPendingRecurrence(null)
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
    const err = validateCustomRecurrence({
      interval: customInterval,
      unit: customUnit,
      daysOfWeek: customDaysOfWeek,
      endCondition: customEndCondition,
      untilDate: customUntilDate,
      count: customCount,
      startDate,
    })
    if (err) {
      setCustomRecurrenceError(err)
      return
    }
    setCustomRecurrenceError(null)
    if (entryType === 'task' && hasDeadline) {
      setPendingRecurrence('custom')
      setIsCustomRecurrenceOpen(false)
      return
    }
    setRecurrenceFreq('custom')
    setIsCustomRecurrenceOpen(false)
  }

  const handleCancelCustomRecurrence = () => {
    setCustomRecurrenceError(null)
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
    const original = initialEvent?.isAllDay === isAllDay ? initialEvent : undefined
    const startIso = serializeEventTime(
      startDate, isAllDay ? '00:00:00' : `${startTime}:00`, activeTimeZone, original?.startDate, isAllDay,
    )
    const endIso = serializeEventTime(
      endDate, isAllDay ? '23:59:59' : `${endTime}:00`, activeTimeZone, original?.endDate, isAllDay,
    )

    let deadlineIso: string | null = null
    if (entryType === 'task' && hasDeadline && deadlineDate && recurrenceFreq === 'none') {
      deadlineIso = serializeEventTime(deadlineDate, isAllDay ? '23:59:59' : `${deadlineTime}:00`,
        activeTimeZone, original?.deadline, isAllDay)
    }

    const convertedReminders: ReminderItem[] = reminders.map((r) => ({
      method: r.method,
      minutesBefore: reminderFormToMinutes(r.quantity, r.unit),
    }))

    let recurrencePayload: RecurrenceConfig = { frequency: 'none', interval: 1 }
    if (recurrenceFreq !== 'none') {
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
    if (newGuestEmail.trim()) {
      const guestErr = validateGuestInput(
        newGuestEmail,
        guests,
        user?.email,
        creatorEmail || initialEvent?.creator?.email,
        true,
      )
      if (guestErr) {
        setGuestEmailError(guestErr)
        return
      }
      submissionGuests.push({
        email: newGuestEmail.trim().toLowerCase(),
        role: isOwner && guestCanModify ? 'editor' : 'viewer',
        canModify: isOwner ? guestCanModify : false,
        canInviteOthers: guestCanInviteOthers,
        canSeeGuestList: guestCanSeeGuestList,
        status: 'pending',
      })
      setGuests(submissionGuests)
      setNewGuestEmail('')
      setGuestEmailError(null)
    }

    const currentChecklist = [...checklist]
    if (entryType === 'task' && newSubtaskTitle.trim()) {
      const stepErr = validateChecklistStep(newSubtaskTitle, checklist)
      if (stepErr) {
        setErrors((prev) => ({ ...prev, checklist: stepErr }))
        return
      }
      currentChecklist.push({
        id: `step-${crypto.randomUUID()}`,
        title: newSubtaskTitle.trim(),
        isCompleted: false,
      })
      setChecklist(currentChecklist)
      setNewSubtaskTitle('')
      clearError('checklist')
    }

    const normalizedTitle = title.trim() || 'Không có tiêu đề'

    const payload: CreateEventInput = {
      title: normalizedTitle,
      entryType,
      priority,
      startDate: startIso,
      endDate: endIso,
      deadline: deadlineIso,
      isAllDay,
      calendarId: entryType === 'task' ? null : calendarId || null,
      location: entryType === 'event' ? location : '',
      onlineMeetingUrl: entryType === 'event' ? onlineMeetingUrl : '',
      submissionUrl: entryType === 'task' ? submissionUrl : '',
      description,
      color: color || (entryType === 'task' ? (PRIORITY_CONFIG[priority]?.color || '#3B82F6') : ''),
      availability,
      visibility: entryType === 'task' && visibility === 'default' ? 'private' : visibility,
      timeZone: initialEvent && !initialEvent.timeZone && activeTimeZone === (selectedCategory?.settings?.timeZone || 'Asia/Ho_Chi_Minh')
        ? initialEvent.timeZone
        : activeTimeZone,
      guests: submissionGuests,
      checklist: entryType === 'task' ? currentChecklist : [],
      reminders: convertedReminders,
      recurrence: recurrencePayload,
    }

    const validationErrors = validateEventForm(payload)
    const missingUntil =
      recurrenceFreq === 'custom' && customEndCondition === 'until' && !recurrencePayload.until
    if (missingUntil) {
      validationErrors.recurrence = 'Quy tắc lặp lại không hợp lệ. Kiểm tra chu kỳ (1–99), ngày kết thúc và số lần lặp (1–365).'
    }
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    if (initialEvent && isRecurring) {
      if (recurrencePayload.frequency === 'none') {
        if (!await confirmRecurring('stop', entryType, title)) return
      } else {
        setPendingSavePayload(payload)
        setShowEditScopeModal(true)
        return
      }
    }

    await executeSave(payload)
  }

  const executeSave = async (
    payload: CreateEventInput,
    mode?: 'this' | 'following' | 'all',
  ) => {
    try {
      setIsSubmitting(true)
      if (initialEvent) {
        const realEventId =
          (initialEvent as unknown as { _baseEventId?: string })._baseEventId || initialEvent.id
        const targetDate = initialDate?.toISOString() ?? initialEvent.startDate
        await calendarApi.updateEvent(realEventId, {
          ...payload,
          isCompleted: entryType === 'task' ? isCompleted : false,
          ...(mode ? { mode, targetDate } : {}),
        })
      } else {
        await calendarApi.createEvent(payload)
      }
      setShowEditScopeModal(false)
      setPendingSavePayload(null)
      onSaved()
      window.dispatchEvent(new CustomEvent('edutrack-calendar-refresh'))
      onClose()
    } catch (err: unknown) {
      setShowEditScopeModal(false)
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

  const handleConfirmEditScope = async (mode: 'this' | 'following' | 'all') => {
    if (!pendingSavePayload) return
    await executeSave(pendingSavePayload, mode)
  }

  const handleCancelEditScope = () => {
    setShowEditScopeModal(false)
    setPendingSavePayload(null)
  }

  const handleDeleteEvent = async (
    mode?: 'this' | 'following' | 'all',
    googleDeleteScope?: 'local_only' | 'both',
  ) => {
    if (!initialEvent) return
    try {
      setIsDeleting(true)
      setGeneralError(null)

      const realEventId =
        (initialEvent as unknown as { _baseEventId?: string })._baseEventId || initialEvent.id
      const targetDate = initialDate?.toISOString() ?? initialEvent.startDate

      if (isRecurring) {
        await calendarApi.deleteEvent(
          realEventId,
          mode ?? deleteRecurringMode,
          targetDate,
          googleDeleteScope,
        )
      } else {
        await calendarApi.deleteEvent(realEventId, 'all', undefined, googleDeleteScope)
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
    confirmation,
    handleTabChange,
    title,
    setTitle: (val: string) => { setTitle(val); clearError('title') },
    calendarId,
    handleCalendarSelect,
    priority,
    setPriority,
    handleSelectPriority,
    showPriorityConfirmDialog,
    setShowPriorityConfirmDialog,
    pendingPriority,
    handleApplyPriorityConfig,
    handleKeepCurrentConfig,
    hasDeadline,
    setHasDeadline,
    isCompleted,
    setIsCompleted,
    handleToggleComplete,
    checklistCompletedCount,
    checklistTotalCount,
    checklistProgressPercent,
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
    setNewGuestEmail: (val: string) => {
      setNewGuestEmail(val)
      if (guestEmailError) setGuestEmailError(null)
    },
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
    pendingRecurrence,
    handleConfirmRecurrenceWithoutDeadline,
    handleCancelRecurrenceChange,
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
    customRecurrenceError,
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
    setDeadlineDate: (val: string) => { setDeadlineDate(val); clearError('deadline') },
    deadlineTime,
    setDeadlineTime: (val: string) => { setDeadlineTime(val); clearError('deadline') },
    submissionUrl,
    setSubmissionUrl: (val: string) => { setSubmissionUrl(val); clearError('submissionUrl') },
    checklist,
    newSubtaskTitle,
    setNewSubtaskTitle: (val: string) => { setNewSubtaskTitle(val); clearError('checklist') },
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
    showEditScopeModal,
    handleConfirmEditScope,
    handleCancelEditScope,
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
    isGoogleReadOnly,
    isGoogleLinked,
    currentGuest,
    guestStatus,
    setGuestStatus,
    canModify,
    canInviteOthers,
    canSeeGuestList,
    handleRespondInvite,
  }
}

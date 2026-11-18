import { useEffect, useState } from 'react'
import type {
  CalendarCategory,
  CalendarEvent,
  CreateEventInput,
  EntryType,
  EventAvailability,
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

export const GOOGLE_CALENDAR_COLORS = [
  '#2563EB', // Xanh dương đậm
  '#0284C7', // Xanh da trời
  '#0EA5E9', // Xanh cyan
  '#0D9488', // Xanh mòng két (Teal)
  '#059669', // Xanh lục bảo (Emerald)
  '#16A34A', // Xanh lá cây (Green)
  '#65A30D', // Xanh cốm (Lime)
  '#CA8A04', // Vàng chuối (Yellow)
  '#D97706', // Hổ phách (Amber)
  '#EA580C', // Cam cháy (Orange)
  '#DC2626', // Đỏ cà chua (Red)
  '#E11D48', // Hồng mâm xôi (Rose)
  '#DB2777', // Hồng cánh sen (Pink)
  '#9333EA', // Tím phong lan (Purple)
  '#7C3AED', // Tím hoa cà (Violet)
  '#4F46E5', // Xanh chàm (Indigo)
  '#475569', // Xám chì (Slate)
  '#57534E', // Xám tro (Stone)
]

export const EXTENDED_CALENDAR_COLORS = GOOGLE_CALENDAR_COLORS

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

export function useEventModalViewModel({
  isOpen,
  initialEvent,
  initialDate,
  categories,
  onClose,
  onSaved,
}: UseEventModalViewModelProps) {
  const defaults = getInitialDateStrings()

  const [entryType, setEntryType] = useState<EntryType>('event')
  const [title, setTitle] = useState('')
  const [calendarId, setCalendarId] = useState<string>('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('') // Rỗng = kế thừa màu từ Lịch
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false)

  // Trạng thái Rảnh/Bận và Hiển thị
  const [availability, setAvailability] = useState<EventAvailability>('busy')
  const [visibility, setVisibility] = useState<EventVisibility>('default')

  // Nhắc nhở danh sách (Reminders)
  const [reminders, setReminders] = useState<ReminderFormItem[]>([
    { id: 'rem-1', method: 'in-app', quantity: 15, unit: 'minutes' },
  ])

  // Lặp lại và Tùy chỉnh lặp lại (Recurrence)
  const [recurrenceFreq, setRecurrenceFreq] = useState<RecurrenceFrequency>('none')
  const [isCustomRecurrenceOpen, setIsCustomRecurrenceOpen] = useState(false)
  const [customInterval, setCustomInterval] = useState(1)
  const [customUnit, setCustomUnit] = useState<'day' | 'week' | 'month' | 'year'>('week')
  const [customDaysOfWeek, setCustomDaysOfWeek] = useState<number[]>([1]) // Mặc định Thứ 2 (1)
  const [customEndCondition, setCustomEndCondition] = useState<'never' | 'until' | 'count'>('never')
  const [customUntilDate, setCustomUntilDate] = useState('')
  const [customCount, setCustomCount] = useState(10)

  // Event-specific fields
  const [startDate, setStartDate] = useState(defaults.startDate)
  const [startTime, setStartTime] = useState(defaults.startTime)
  const [endDate, setEndDate] = useState(defaults.endDate)
  const [endTime, setEndTime] = useState(defaults.endTime)
  const [isAllDay, setIsAllDay] = useState(false)
  const [location, setLocation] = useState('')
  const [onlineMeetingUrl, setOnlineMeetingUrl] = useState('')

  // Task-specific fields
  const [deadlineDate, setDeadlineDate] = useState(defaults.deadlineDate)
  const [deadlineTime, setDeadlineTime] = useState(defaults.deadlineTime)
  const [priority, setPriority] = useState<EventPriority>('medium')
  const [submissionUrl, setSubmissionUrl] = useState('')
  const [checklist, setChecklist] = useState<SubtaskItem[]>([])
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [generalError, setGeneralError] = useState<string | null>(null)

  // Khởi tạo form khi modal mở hoặc thay đổi event
  useEffect(() => {
    let active = true
    const timer = window.setTimeout(() => {
      if (!active) return

      if (!isOpen) {
        setErrors({})
        setGeneralError(null)
        setIsColorPickerOpen(false)
        setIsCustomRecurrenceOpen(false)
        return
      }

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

        // Reminders
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

        // Recurrence
        if (initialEvent.recurrence) {
          const freq = initialEvent.recurrence.frequency
          setRecurrenceFreq(freq)
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
        }

        setEntryType('event')
        setTitle('')
        setCalendarId(categories.length > 0 && categories[0] ? categories[0].id : '')
        setPriority('medium')
        setStartDate(def.startDate)
        setStartTime(def.startTime)
        setEndDate(def.endDate)
        setEndTime(def.endTime)
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
        setChecklist([])
        setNewSubtaskTitle('')
        setRecurrenceFreq('none')
        setReminders([{ id: 'rem-1', method: 'in-app', quantity: 15, unit: 'minutes' }])
      }
      setErrors({})
      setGeneralError(null)
      setIsColorPickerOpen(false)
      setIsCustomRecurrenceOpen(false)
    }, 0)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [isOpen, initialEvent, initialDate, categories])

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
    // Nếu chuyển sang task và chưa có nhắc nhở nào thì đề xuất nhắc 1 giờ trước
    if (nextType === 'task' && reminders.length === 0) {
      setReminders([{ id: 'rem-task-default', method: 'in-app', quantity: 1, unit: 'hours' }])
    }
  }

  const handleCalendarSelect = (id: string) => {
    setCalendarId(id)
    clearError('calendarId')
  }

  // Active Color: Màu đang áp dụng (nếu override có màu thì dùng, không thì lấy màu của category)
  const selectedCategory = categories.find((c) => c.id === calendarId)
  const activeColor = color || selectedCategory?.color || '#2563EB'

  // Xử lý Reminders
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

  // Checklist Actions cho Task
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

  // Xử lý Custom Recurrence
  const handleSelectRecurrence = (freq: RecurrenceFrequency) => {
    if (freq === 'custom') {
      setIsCustomRecurrenceOpen(true)
      setRecurrenceFreq('custom')
    } else {
      setRecurrenceFreq(freq)
      setIsCustomRecurrenceOpen(false)
    }
  }

  const handleToggleCustomDay = (day: number) => {
    setCustomDaysOfWeek((prev) => {
      if (prev.includes(day)) {
        if (prev.length === 1) return prev // Giữ ít nhất 1 ngày
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
    if (recurrenceFreq === 'custom' && !initialEvent?.recurrence) {
      setRecurrenceFreq('none')
    }
    setIsCustomRecurrenceOpen(false)
  }

  // Nhãn mô tả thân thiện cho tùy chọn lặp lại hiện tại
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

  // Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setGeneralError(null)

    let startIso: string
    let endIso: string

    if (entryType === 'task') {
      if (isAllDay) {
        startIso = new Date(`${deadlineDate}T00:00:00`).toISOString()
        endIso = new Date(`${deadlineDate}T23:59:59`).toISOString()
      } else {
        startIso = new Date(`${deadlineDate}T${deadlineTime}:00`).toISOString()
        endIso = new Date(`${deadlineDate}T${deadlineTime}:00`).toISOString()
      }
    } else {
      if (isAllDay) {
        startIso = new Date(`${startDate}T00:00:00`).toISOString()
        endIso = new Date(`${endDate}T23:59:59`).toISOString()
      } else {
        startIso = new Date(`${startDate}T${startTime}:00`).toISOString()
        endIso = new Date(`${endDate}T${endTime}:00`).toISOString()
      }
    }

    // Chuyển đổi reminders form sang minutesBefore
    const convertedReminders: ReminderItem[] = reminders.map((r) => ({
      method: r.method,
      minutesBefore: reminderFormToMinutes(r.quantity, r.unit),
    }))

    // Cấu hình lặp lại
    let recurrencePayload: RecurrenceConfig | undefined
    if (entryType === 'event' && recurrenceFreq !== 'none') {
      if (recurrenceFreq === 'custom') {
        recurrencePayload = {
          frequency: 'custom',
          interval: Math.max(1, customInterval),
          daysOfWeek: customUnit === 'week' ? customDaysOfWeek : undefined,
          until: customEndCondition === 'until' && customUntilDate ? new Date(customUntilDate).toISOString() : null,
          count: customEndCondition === 'count' && customCount > 0 ? customCount : null,
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
      color, // Nếu người dùng chọn màu riêng thì gửi color, nếu không thì rỗng để backend fallback
      availability,
      visibility,
      checklist: entryType === 'task' ? checklist : [],
      reminders: convertedReminders,
      recurrence: recurrencePayload,
    }

    const validationErrors = validateEventForm(payload)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    try {
      setIsSubmitting(true)
      if (initialEvent) {
        await calendarApi.updateEvent(initialEvent.id, payload)
      } else {
        await calendarApi.createEvent(payload)
      }
      onSaved()
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
    // Color Override
    color,
    setColor,
    activeColor,
    isColorPickerOpen,
    setIsColorPickerOpen,
    // Availability & Visibility
    availability,
    setAvailability,
    visibility,
    setVisibility,
    // Reminders
    reminders,
    handleAddReminder,
    handleRemoveReminder,
    handleUpdateReminder,
    // Recurrence
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
    // Event-specific
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
    // Task-specific
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
    // Status
    errors,
    isSubmitting,
    generalError,
    handleSubmit,
  }
}

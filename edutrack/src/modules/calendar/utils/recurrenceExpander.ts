
import type { CalendarEvent, RecurrenceConfig } from '../models/calendar.types'

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

function isDateInExceptions(target: Date, exceptions?: string[]): boolean {
  if (!exceptions || exceptions.length === 0) return false
  return exceptions.some((ex) => isSameDay(new Date(ex), target))
}

function eventDuration(event: CalendarEvent): number {
  return new Date(event.endDate).getTime() - new Date(event.startDate).getTime()
}

function makeOccurrence(base: CalendarEvent, newStart: Date, occurrenceIndex: number): CalendarEvent {
  const duration = eventDuration(base)
  const newEnd = new Date(newStart.getTime() + duration)
  return {
    ...base,
    id: `${base.id}__occ_${occurrenceIndex}`,
    startDate: newStart.toISOString(),
    endDate: newEnd.toISOString(),
    _isOccurrence: true,
    _baseEventId: base.id,
  } as CalendarEvent & { _isOccurrence: boolean; _baseEventId: string }
}

function addInterval(date: Date, frequency: string, interval: number): Date {
  const d = new Date(date)
  switch (frequency) {
    case 'daily':
      d.setDate(d.getDate() + interval)
      break
    case 'weekly':
    case 'weekdays':
      d.setDate(d.getDate() + interval * 7)
      break
    case 'monthly':
    case 'yearly': {
      const day = d.getDate()
      const months = frequency === 'yearly' ? interval * 12 : interval
      d.setDate(1)
      d.setMonth(d.getMonth() + months)
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
      d.setDate(Math.min(day, lastDay))
      break
    }
    default:
      d.setDate(d.getDate() + interval)
  }
  return d
}

export function expandRecurringEvent(
  event: CalendarEvent,
  windowStart: Date,
  windowEnd: Date,
): CalendarEvent[] {
  const rec = event.recurrence
  if (!rec || rec.frequency === 'none') {
    return []
  }

  const baseStart = new Date(event.startDate)
  const occurrences: CalendarEvent[] = []
  let occurrenceIndex = 0

  const untilDate = rec.until ? new Date(rec.until) : null
  const lastStart = untilDate && untilDate < windowEnd ? untilDate : windowEnd
  const maxCount = rec.count ?? null
  const interval = Number.isInteger(rec.interval) && rec.interval > 0 ? rec.interval : 1

  if (rec.frequency === 'weekdays') {
    let current = new Date(baseStart)
    current.setDate(current.getDate() + 1)

    while (current <= lastStart) {
      if (untilDate && current > untilDate) break
      if (maxCount !== null && occurrenceIndex >= maxCount - 1) break

      const dow = current.getDay()
      if (dow >= 1 && dow <= 5) {
        if (current <= windowEnd && current >= windowStart && !isDateInExceptions(current, event.exceptionDates)) {
          occurrences.push(makeOccurrence(event, current, occurrenceIndex))
        }
        occurrenceIndex++
      }
      current = new Date(current)
      current.setDate(current.getDate() + 1)

      if (current > windowEnd && (!untilDate || current > untilDate)) break
    }
    return occurrences
  }

  if (rec.frequency === 'custom' && rec.daysOfWeek && rec.daysOfWeek.length > 0) {
    const startDow = baseStart.getDay()
    const diffToMonday = startDow === 0 ? -6 : 1 - startDow
    let weekStart = new Date(baseStart)
    weekStart.setDate(weekStart.getDate() + diffToMonday)

    const offsets = [...new Set(rec.daysOfWeek)]
      .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
      .map((day) => (day + 6) % 7)
      .sort((first, second) => first - second)

    while (weekStart <= lastStart) {
      if (untilDate && weekStart > untilDate) break
      if (maxCount !== null && occurrenceIndex >= maxCount - 1) break

      for (const diff of offsets) {
        const occDate = new Date(weekStart)
        occDate.setDate(weekStart.getDate() + diff)

        if (occDate <= baseStart) continue
        if (occDate > lastStart) break
        if (maxCount !== null && occurrenceIndex >= maxCount - 1) break

        if (occDate >= windowStart && occDate <= windowEnd && !isDateInExceptions(occDate, event.exceptionDates)) {
          occurrences.push(makeOccurrence(event, occDate, occurrenceIndex))
        }
        occurrenceIndex++
      }

      weekStart = new Date(weekStart)
      weekStart.setDate(weekStart.getDate() + 7 * interval)
      if (weekStart > windowEnd && (!untilDate || weekStart > untilDate)) break
    }
    return occurrences
  }

  let current = addInterval(baseStart, rec.frequency, interval)

  while (current <= lastStart) {
    if (untilDate && current > untilDate) break
    if (maxCount !== null && occurrenceIndex >= maxCount - 1) break
    if (current > windowEnd) break

    if (current >= windowStart && !isDateInExceptions(current, event.exceptionDates)) {
      occurrences.push(makeOccurrence(event, current, occurrenceIndex))
    }

    occurrenceIndex++
    current = addInterval(baseStart, rec.frequency, interval * (occurrenceIndex + 1))
  }

  return occurrences
}

export function expandAllRecurringEvents(
  events: CalendarEvent[],
  windowStart: Date,
  windowEnd: Date,
): CalendarEvent[] {
  const result: CalendarEvent[] = []

  for (const event of events) {
    if (!isDateInExceptions(new Date(event.startDate), event.exceptionDates)) {
      result.push(event)
    }

    if (event.recurrence && event.recurrence.frequency !== 'none') {
      const occurrences = expandRecurringEvent(event, windowStart, windowEnd)
      result.push(...occurrences)
    }
  }

  return result
}

export function getRecurrenceDisplayLabel(rec: RecurrenceConfig | undefined): string {
  if (!rec || rec.frequency === 'none') return ''
  switch (rec.frequency) {
    case 'daily': return `Hàng ngày${rec.interval > 1 ? ` (mỗi ${rec.interval} ngày)` : ''}`
    case 'weekly': return `Hàng tuần${rec.interval > 1 ? ` (mỗi ${rec.interval} tuần)` : ''}`
    case 'monthly': return `Hàng tháng${rec.interval > 1 ? ` (mỗi ${rec.interval} tháng)` : ''}`
    case 'yearly': return `Hàng năm${rec.interval > 1 ? ` (mỗi ${rec.interval} năm)` : ''}`
    case 'weekdays': return 'Mọi ngày trong tuần (T2–T6)'
    case 'custom': {
      const unitMap: Record<string, string> = { day: 'ngày', week: 'tuần', month: 'tháng', year: 'năm' }
      const dayMap: Record<number, string> = { 1: 'T2', 2: 'T3', 3: 'T4', 4: 'T5', 5: 'T6', 6: 'T7', 0: 'CN' }
      if (rec.daysOfWeek && rec.daysOfWeek.length > 0) {
        const days = rec.daysOfWeek.map((d) => dayMap[d]).join(', ')
        return `Mỗi ${rec.interval} tuần vào ${days}`
      }
      const unit = unitMap['week'] || 'tuần'
      return `Mỗi ${rec.interval} ${unit}`
    }
    default: return ''
  }
}

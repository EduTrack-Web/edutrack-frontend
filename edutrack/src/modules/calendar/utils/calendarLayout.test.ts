import { describe, expect, it } from 'vitest'
import type { CalendarEvent } from '../models/calendar.types'
import { validateEventTitle } from '../models/calendarValidation'
import {
  buildEventsByDateMap,
  buildTimedSegmentsForDate,
  isFirstOccurrenceInSeries,
  layoutDayTimedSegments,
  unifyMultiDaySegmentWidths,
} from './calendarLayout'

function makeEvent(overrides: Partial<CalendarEvent> & { id: string; startDate: string; endDate: string }): CalendarEvent {
  return {
    userId: 'u1',
    entryType: 'event',
    title: `Event ${overrides.id}`,
    description: '',
    priority: 'medium',
    isAllDay: false,
    location: '',
    onlineMeetingUrl: '',
    submissionUrl: '',
    color: '#2563EB',
    availability: 'busy',
    visibility: 'default',
    isCompleted: false,
    checklist: [],
    reminders: [],
    createdAt: '2026-11-24T00:00:00.000Z',
    updatedAt: '2026-11-24T00:00:00.000Z',
    ...overrides,
  }
}

describe('calendarLayout multi-day segmentation', () => {
  it('splits an overnight event (21:00 -> 09:00 next day) across two day columns', () => {
    const overnight = makeEvent({
      id: 'overnight-1',
      startDate: new Date(2026, 10, 24, 21, 0, 0).toISOString(),
      endDate: new Date(2026, 10, 25, 9, 0, 0).toISOString(),
    })

    const map = buildEventsByDateMap([overnight])
    expect(Object.keys(map).sort()).toEqual(['2026-11-24', '2026-11-25'])

    const day1Segments = buildTimedSegmentsForDate(map['2026-11-24'] ?? [], new Date(2026, 10, 24))
    expect(day1Segments).toHaveLength(1)
    expect(day1Segments[0]).toMatchObject({
      startMin: 21 * 60,
      endMin: 24 * 60,
      isStartSegment: true,
      isEndSegment: false,
      isMultiDay: true,
    })

    const day2Segments = buildTimedSegmentsForDate(map['2026-11-25'] ?? [], new Date(2026, 10, 25))
    expect(day2Segments).toHaveLength(1)
    expect(day2Segments[0]).toMatchObject({
      startMin: 0,
      endMin: 9 * 60,
      isStartSegment: false,
      isEndSegment: true,
      isMultiDay: true,
    })
  })

  it('splits a multi-day event across month/year boundary cleanly', () => {
    const crossYear = makeEvent({
      id: 'cross-year',
      startDate: new Date(2026, 11, 31, 22, 0, 0).toISOString(),
      endDate: new Date(2027, 0, 2, 8, 0, 0).toISOString(),
    })

    const map = buildEventsByDateMap([crossYear])
    expect(Object.keys(map).sort()).toEqual(['2026-12-31', '2027-01-01', '2027-01-02'])

    const dec31 = buildTimedSegmentsForDate([crossYear], new Date(2026, 11, 31))
    const jan01 = buildTimedSegmentsForDate([crossYear], new Date(2027, 0, 1))
    const jan02 = buildTimedSegmentsForDate([crossYear], new Date(2027, 0, 2))

    expect(dec31[0]).toMatchObject({ startMin: 22 * 60, endMin: 1440, isStartSegment: true, isEndSegment: false })
    expect(jan01[0]).toMatchObject({ startMin: 0, endMin: 1440, isStartSegment: false, isEndSegment: false })
    expect(jan02[0]).toMatchObject({ startMin: 0, endMin: 8 * 60, isStartSegment: false, isEndSegment: true })
  })

  it('does not create a phantom segment on the next day when ending at exact 00:00', () => {
    const untilMidnight = makeEvent({
      id: 'midnight-end',
      startDate: new Date(2026, 10, 24, 20, 0, 0).toISOString(),
      endDate: new Date(2026, 10, 25, 0, 0, 0).toISOString(),
    })

    const map = buildEventsByDateMap([untilMidnight])
    expect(Object.keys(map)).toEqual(['2026-11-24'])
    expect(buildTimedSegmentsForDate([untilMidnight], new Date(2026, 10, 25))).toHaveLength(0)
  })
})

describe('layoutDayTimedSegments overlap layout', () => {
  const day = new Date(2026, 10, 24)

  it('keeps full 100% width for non-overlapping events', () => {
    const events = [
      makeEvent({ id: 'a', startDate: new Date(2026, 10, 24, 8, 0).toISOString(), endDate: new Date(2026, 10, 24, 9, 0).toISOString() }),
      makeEvent({ id: 'b', startDate: new Date(2026, 10, 24, 10, 0).toISOString(), endDate: new Date(2026, 10, 24, 11, 0).toISOString() }),
    ]
    const positioned = layoutDayTimedSegments(buildTimedSegmentsForDate(events, day))
    expect(positioned.every((p) => p.widthPct === 100 && p.leftPct === 0)).toBe(true)
  })

  it('cascades overlapping events with increasing zIndex like Google Calendar', () => {
    const evA = makeEvent({
      id: 'A',
      startDate: new Date(2026, 10, 24, 8, 0).toISOString(),
      endDate: new Date(2026, 10, 24, 11, 0).toISOString(),
    })
    const evB = makeEvent({
      id: 'B',
      startDate: new Date(2026, 10, 24, 8, 0).toISOString(),
      endDate: new Date(2026, 10, 24, 9, 0).toISOString(),
    })
    const evC = makeEvent({
      id: 'C',
      startDate: new Date(2026, 10, 24, 8, 0).toISOString(),
      endDate: new Date(2026, 10, 24, 8, 15).toISOString(),
    })

    const positioned = layoutDayTimedSegments(
      buildTimedSegmentsForDate([evA, evB, evC], day),
    )
    const posA = positioned.find((p) => p.event.id === 'A')!
    const posB = positioned.find((p) => p.event.id === 'B')!
    const posC = positioned.find((p) => p.event.id === 'C')!

    expect(posA.columnIndex).toBe(0)
    expect(posB.columnIndex).toBe(1)
    expect(posC.columnIndex).toBe(2)

    expect(posA.leftPct).toBe(0)
    expect(posA.widthPct).toBeCloseTo(50, 2)
    expect(posB.leftPct).toBeCloseTo(33.33, 1)
    expect(posB.widthPct).toBeCloseTo(50, 2)
    expect(posC.leftPct).toBeCloseTo(66.67, 1)
    expect(posC.widthPct).toBeCloseTo(33.33, 1)

    expect(posA.zIndex).toBeLessThan(posB.zIndex)
    expect(posB.zIndex).toBeLessThan(posC.zIndex)
  })

  it('unifies width across all days of a multi-day event when another event overlaps on one day', () => {
    const multiDay = makeEvent({
      id: 'multi',
      startDate: new Date(2026, 10, 24, 15, 0).toISOString(),
      endDate: new Date(2026, 10, 25, 6, 0).toISOString(),
    })
    const day2Overlap = makeEvent({
      id: 'day2-other',
      startDate: new Date(2026, 10, 25, 2, 0).toISOString(),
      endDate: new Date(2026, 10, 25, 4, 0).toISOString(),
    })

    const byDate = unifyMultiDaySegmentWidths({
      '2026-11-24': layoutDayTimedSegments(buildTimedSegmentsForDate([multiDay], new Date(2026, 10, 24))),
      '2026-11-25': layoutDayTimedSegments(buildTimedSegmentsForDate([multiDay, day2Overlap], new Date(2026, 10, 25))),
    })

    const segDay1 = byDate['2026-11-24']?.[0]
    const segDay2 = byDate['2026-11-25']?.find((s) => s.event.id === 'multi')
    expect(segDay1).toBeDefined()
    expect(segDay2).toBeDefined()
    expect(segDay1?.widthPct).toBe(segDay2?.widthPct)
    expect(segDay1?.widthPct).toBeLessThan(100)
  })

  it('reuses columns for partially overlapping chains', () => {
    const a = makeEvent({ id: 'a', startDate: new Date(2026, 10, 24, 9, 0).toISOString(), endDate: new Date(2026, 10, 24, 11, 0).toISOString() })
    const b = makeEvent({ id: 'b', startDate: new Date(2026, 10, 24, 10, 0).toISOString(), endDate: new Date(2026, 10, 24, 12, 0).toISOString() })
    const c = makeEvent({ id: 'c', startDate: new Date(2026, 10, 24, 11, 0).toISOString(), endDate: new Date(2026, 10, 24, 13, 0).toISOString() })

    const positioned = layoutDayTimedSegments(buildTimedSegmentsForDate([a, b, c], day))
    const posA = positioned.find((p) => p.event.id === 'a')!
    const posB = positioned.find((p) => p.event.id === 'b')!
    const posC = positioned.find((p) => p.event.id === 'c')!

    expect(posA.totalColumns).toBe(2)
    expect(posA.columnIndex).toBe(0)
    expect(posB.columnIndex).toBe(1)
    expect(posC.columnIndex).toBe(0)
  })
})

describe('isFirstOccurrenceInSeries', () => {
  it('treats the earliest active occurrence as first even when earlier dates were excluded', () => {
    const base = makeEvent({
      id: 'series-1',
      startDate: new Date(2026, 11, 26, 9, 0).toISOString(),
      endDate: new Date(2026, 11, 26, 10, 0).toISOString(),
    })
    const occ2 = makeEvent({
      id: 'series-1__occ_0',
      startDate: new Date(2026, 11, 27, 9, 0).toISOString(),
      endDate: new Date(2026, 11, 27, 10, 0).toISOString(),
    })
    ;(occ2 as CalendarEvent & { _baseEventId?: string })._baseEventId = 'series-1'

    expect(isFirstOccurrenceInSeries([base, occ2], base)).toBe(true)
    expect(isFirstOccurrenceInSeries([base, occ2], occ2)).toBe(false)
    expect(isFirstOccurrenceInSeries([occ2], occ2)).toBe(true)
  })
})

describe('optional event title validation', () => {
  it('allows empty and whitespace-only titles without returning an error', () => {
    expect(validateEventTitle('')).toBeUndefined()
    expect(validateEventTitle('   ')).toBeUndefined()
    expect(validateEventTitle('a'.repeat(151))).toBeTruthy()
  })
})


import type { CalendarEvent } from '../models/calendar.types'

export interface TimedEventSegment {
  segmentId: string
  event: CalendarEvent
  dateKey: string
  startMin: number
  endMin: number
  durationMin: number
  isZeroDuration: boolean
  isStartSegment: boolean
  isEndSegment: boolean
  isMultiDay: boolean
}

export interface PositionedTimedSegment extends TimedEventSegment {
  leftPct: number
  widthPct: number
  columnIndex: number
  totalColumns: number
  zIndex: number
}

export function formatDateKey(date: Date): string {
  const m = date.getMonth() + 1
  const d = date.getDate()

  return `${date.getFullYear()}-${m < 10 ? `0${m}` : m}-${d < 10 ? `0${d}` : d}`
}

export function isFirstOccurrenceInSeries(
  allEvents: CalendarEvent[],
  targetEvent: CalendarEvent,
  targetDate?: Date | null,
): boolean {
  const baseId =
    (targetEvent as CalendarEvent & { _baseEventId?: string })._baseEventId || targetEvent.id
  const targetMs = targetDate ? targetDate.getTime() : new Date(targetEvent.startDate).getTime()
  return !allEvents.some((item) => {
    const itemBaseId = (item as CalendarEvent & { _baseEventId?: string })._baseEventId || item.id
    if (itemBaseId !== baseId) return false
    return new Date(item.startDate).getTime() < targetMs - 1000
  })
}

export function buildEventsByDateMap(
  events: CalendarEvent[],
): Record<string, CalendarEvent[]> {
  const map: Record<string, CalendarEvent[]> = {}

  for (const event of events) {
    const start = new Date(event.startDate)
    const end = new Date(event.endDate)

    if (Number.isNaN(start.getTime())) continue

    const startDay = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate(),
    )

    let endDay = startDay

    if (!Number.isNaN(end.getTime()) && end.getTime() > start.getTime()) {
      const endsAtExactMidnight =
        end.getHours() === 0 &&
        end.getMinutes() === 0 &&
        end.getSeconds() === 0 &&
        end.getMilliseconds() === 0

      endDay = endsAtExactMidnight
        ? new Date(end.getFullYear(), end.getMonth(), end.getDate() - 1)
        : new Date(end.getFullYear(), end.getMonth(), end.getDate())

      if (endDay < startDay) {
        endDay = startDay
      }
    }

    const cursor = new Date(startDay)
    let safety = 0

    while (cursor <= endDay && safety < 366) {
      const key = formatDateKey(cursor)

      if (!map[key]) map[key] = []

      map[key].push(event)

      cursor.setDate(cursor.getDate() + 1)
      safety++
    }
  }

  return map
}

export function buildTimedSegmentsForDate(
  events: CalendarEvent[],
  date: Date,
): TimedEventSegment[] {
  const dayStart = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0, 0, 0, 0,
  )

  const nextDayStart = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + 1,
    0, 0, 0, 0,
  )

  const dayStartMs = dayStart.getTime()
  const nextDayStartMs = nextDayStart.getTime()
  const dateKey = formatDateKey(dayStart)

  const segments: TimedEventSegment[] = []

  for (const event of events) {
    if (event.isAllDay) continue

    const startMs = new Date(event.startDate).getTime()
    const rawEndMs = new Date(event.endDate).getTime()

    if (Number.isNaN(startMs)) continue

    const endMs = Number.isNaN(rawEndMs)
      ? startMs
      : Math.max(startMs, rawEndMs)

    const isZeroDuration = endMs === startMs

    const intersects = isZeroDuration
      ? startMs >= dayStartMs && startMs < nextDayStartMs
      : startMs < nextDayStartMs && endMs > dayStartMs

    if (!intersects) continue

    const segStartMs = Math.max(startMs, dayStartMs)
    const segEndMs = Math.min(endMs, nextDayStartMs)

    const startMin = Math.max(
      0,
      Math.min(1439, Math.round((segStartMs - dayStartMs) / 60000)),
    )

    const endMin = isZeroDuration
      ? startMin
      : Math.max(
          startMin,
          Math.min(1440, Math.round((segEndMs - dayStartMs) / 60000)),
        )

    const isStartSegment = startMs >= dayStartMs
    const isEndSegment = endMs <= nextDayStartMs

    segments.push({
      segmentId: `${event.id}__${dateKey}`,
      event,
      dateKey,
      startMin,
      endMin,
      durationMin: Math.max(0, endMin - startMin),
      isZeroDuration,
      isStartSegment,
      isEndSegment,
      isMultiDay: !isStartSegment || !isEndSegment,
    })
  }

  return segments
}

interface LayoutItem {
  seg: TimedEventSegment
  effectiveEndMin: number
}

interface PlacedSegment extends LayoutItem {
  col: number
}

/**
 * Khoảng thời gian hiển thị tối thiểu cho event không có duration.
 * Dùng để tránh các event zero-duration bị xếp chồng hoàn toàn.
 */
const MIN_EVENT_DURATION = 15

function getEffectiveEnd(seg: TimedEventSegment): number {
  return Math.max(seg.startMin + MIN_EVENT_DURATION, seg.endMin)
}

/**
 * Phân cột cho một nhóm sự kiện có giao nhau.
 *
 * Các event được sắp xếp theo:
 * 1. Thời gian bắt đầu tăng dần.
 * 2. Thời gian kết thúc giảm dần.
 *
 * Sử dụng cột trống đầu tiên để hạn chế số cột.
 */
function assignColumns(
  cluster: LayoutItem[],
): {
  columns: PlacedSegment[][]
  placed: PlacedSegment[]
} {
  const sorted = [...cluster].sort((a, b) => {
    if (a.seg.startMin !== b.seg.startMin) {
      return a.seg.startMin - b.seg.startMin
    }

    if (a.effectiveEndMin !== b.effectiveEndMin) {
      return b.effectiveEndMin - a.effectiveEndMin
    }

    return a.seg.segmentId.localeCompare(b.seg.segmentId)
  })

  const columns: PlacedSegment[][] = []
  const colLastEnd: number[] = []
  const placed: PlacedSegment[] = []

  for (const item of sorted) {
    let assignedCol = -1

    for (let c = 0; c < colLastEnd.length; c++) {
      if ((colLastEnd[c] ?? 0) <= item.seg.startMin) {
        assignedCol = c
        break
      }
    }

    if (assignedCol === -1) {
      assignedCol = columns.length
      columns.push([])
      colLastEnd.push(0)
    }

    const entry: PlacedSegment = {
      ...item,
      col: assignedCol,
    }

    columns[assignedCol]?.push(entry)
    colLastEnd[assignedCol] = item.effectiveEndMin

    placed.push(entry)
  }

  return { columns, placed }
}

function canExpandToColumn(
  entry: PlacedSegment,
  column: PlacedSegment[],
): boolean {
  return !column.some(
    (other) =>
      other.seg.startMin < entry.effectiveEndMin &&
      entry.seg.startMin < other.effectiveEndMin,
  )
}

/**
 * Bố trí một nhóm sự kiện giao nhau theo kiểu xếp tầng (cascading overlap) của Google Calendar:
 * sự kiện sau/ngắn hơn nằm lệch sang phải và đè nhẹ lên mép phải sự kiện trước với zIndex cao hơn.
 */
function layoutOverlapCluster(
  cluster: LayoutItem[],
): PositionedTimedSegment[] {
  if (cluster.length === 0) return []

  const { columns, placed } = assignColumns(cluster)
  const totalColumns = columns.length

  if (totalColumns === 1) {
    return placed.map((entry) => ({
      ...entry.seg,
      leftPct: 0,
      widthPct: 100,
      columnIndex: 0,
      totalColumns: 1,
      zIndex: 10,
    }))
  }

  const stepPct = 100 / totalColumns
  const overlapBonusPct = Math.min(18, stepPct * 0.5)

  return placed.map((entry) => {
    let spanColumns = 1
    for (let nextCol = entry.col + 1; nextCol < totalColumns; nextCol++) {
      const nextColumn = columns[nextCol] ?? []
      if (!canExpandToColumn(entry, nextColumn)) {
        break
      }
      spanColumns++
    }

    const leftPct = entry.col * stepPct
    const reachesRightEdge = entry.col + spanColumns >= totalColumns
    const widthPct = reachesRightEdge
      ? 100 - leftPct
      : Math.min(100 - leftPct, spanColumns * stepPct + overlapBonusPct)

    return {
      ...entry.seg,
      leftPct,
      widthPct,
      columnIndex: entry.col,
      totalColumns,
      zIndex: 10 + entry.col,
    }
  })
}

/**
 * Bố trí tất cả event trong một ngày.
 */
export function layoutDayTimedSegments(
  segments: TimedEventSegment[],
): PositionedTimedSegment[] {
  if (segments.length === 0) return []

  const items: LayoutItem[] = segments
    .map((seg) => ({
      seg,
      effectiveEndMin: getEffectiveEnd(seg),
    }))
    .sort((a, b) => {
      if (a.seg.startMin !== b.seg.startMin) {
        return a.seg.startMin - b.seg.startMin
      }

      return b.effectiveEndMin - a.effectiveEndMin
    })

  const positioned: PositionedTimedSegment[] = []

  let currentCluster: LayoutItem[] = []
  let clusterEnd = -1

  for (const item of items) {
    // Khi event tiếp theo không còn giao với cluster hiện tại,
    // hoàn thành cluster và bắt đầu nhóm mới.
    if (
      currentCluster.length > 0 &&
      item.seg.startMin >= clusterEnd
    ) {
      positioned.push(...layoutOverlapCluster(currentCluster))

      currentCluster = []
      clusterEnd = -1
    }

    currentCluster.push(item)

    clusterEnd = Math.max(
      clusterEnd,
      item.effectiveEndMin,
    )
  }

  if (currentCluster.length > 0) {
    positioned.push(...layoutOverlapCluster(currentCluster))
  }

  return positioned.sort((a, b) => {
    if (a.startMin !== b.startMin) {
      return a.startMin - b.startMin
    }

    return a.columnIndex - b.columnIndex
  })
}

/**
 * Đồng bộ độ rộng của các đoạn thuộc cùng một sự kiện nhiều ngày
 * để mọi ngày sự kiện đi qua đều có cùng tỷ lệ chiều rộng (lấy theo ngày hẹp nhất).
 */
export function unifyMultiDaySegmentWidths(
  segmentsByDate: Record<string, PositionedTimedSegment[]>,
): Record<string, PositionedTimedSegment[]> {
  const minWidthByEventId = new Map<string, number>()

  for (const list of Object.values(segmentsByDate)) {
    for (const seg of list) {
      if (!seg.isMultiDay) continue
      const prevMin = minWidthByEventId.get(seg.event.id)
      if (prevMin === undefined || seg.widthPct < prevMin) {
        minWidthByEventId.set(seg.event.id, seg.widthPct)
      }
    }
  }

  if (minWidthByEventId.size === 0) return segmentsByDate

  const result: Record<string, PositionedTimedSegment[]> = {}
  for (const [dateKey, list] of Object.entries(segmentsByDate)) {
    result[dateKey] = list.map((seg) => {
      if (!seg.isMultiDay) return seg
      const unifiedWidth = minWidthByEventId.get(seg.event.id)
      if (unifiedWidth === undefined || Math.abs(unifiedWidth - seg.widthPct) < 0.001) {
        return seg
      }
      return {
        ...seg,
        widthPct: unifiedWidth,
      }
    })
  }

  return result
}

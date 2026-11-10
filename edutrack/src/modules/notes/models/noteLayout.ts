import type { NoteSummary } from '@/modules/notes/models/notes.types'

export const sortNotesNewestFirst = <T extends NoteSummary>(notes: T[]): T[] =>
  [...notes].sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))

export const distributeNotesIntoColumns = <T extends NoteSummary>(
  notes: T[],
  columnCount: number,
): T[][] => {
  const safeColumnCount = Math.max(1, Math.floor(columnCount))
  const columns = Array.from({ length: safeColumnCount }, () => [] as T[])

  notes.forEach((note, index) => {
    columns[index % safeColumnCount]?.push(note)
  })

  return columns
}

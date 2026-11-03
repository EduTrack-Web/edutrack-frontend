import type { NoteSummary } from './notes.types'

export const sortNotesNewestFirst = (notes: NoteSummary[]): NoteSummary[] =>
  [...notes].sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))

export const distributeNotesIntoColumns = (
  notes: NoteSummary[],
  columnCount: number,
): NoteSummary[][] => {
  const safeColumnCount = Math.max(1, Math.floor(columnCount))
  const columns = Array.from({ length: safeColumnCount }, () => [] as NoteSummary[])

  notes.forEach((note, index) => {
    columns[index % safeColumnCount]?.push(note)
  })

  return columns
}

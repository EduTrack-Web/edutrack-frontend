import { describe, expect, it } from 'vitest'

import type { NoteSummary } from './notes.types'
import { distributeNotesIntoColumns, sortNotesNewestFirst } from './noteLayout'

const createNote = (id: string, updatedAt: string): NoteSummary => ({
  id,
  title: id,
  preview: '',
  contentPreview: { type: 'doc', content: [] },
  background: 'default',
  version: 1,
  createdAt: updatedAt,
  updatedAt,
  access: { role: 'owner', canEdit: true, canManageAccess: true, isSharedWithMe: false },
})

describe('note masonry layout', () => {
  it('sorts notes from newest to oldest by update time', () => {
    const notes = [
      createNote('older', '2026-11-01T08:00:00.000Z'),
      createNote('newest', '2026-11-03T08:00:00.000Z'),
      createNote('middle', '2026-11-02T08:00:00.000Z'),
    ]

    expect(sortNotesNewestFirst(notes).map((note) => note.id)).toEqual(['newest', 'middle', 'older'])
  })

  it('places chronological items from left to right before continuing downward', () => {
    const notes = ['first', 'second', 'third', 'fourth', 'fifth'].map((id, index) =>
      createNote(id, `2026-11-0${5 - index}T08:00:00.000Z`),
    )

    const columns = distributeNotesIntoColumns(notes, 3)

    expect(columns.map((column) => column.map((note) => note.id))).toEqual([
      ['first', 'fourth'],
      ['second', 'fifth'],
      ['third'],
    ])
  })
})

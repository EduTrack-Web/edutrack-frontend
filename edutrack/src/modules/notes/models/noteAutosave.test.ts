import { describe, expect, it } from 'vitest'

import {
  NOTE_AUTOSAVE_INTERVAL_MS,
  NOTE_IMAGE_MAX_SIZE_BYTES,
  validateNoteImageFile,
} from '../config/notes.config'
import { NoteAutosaveTracker, type NoteDraft } from './noteAutosave'

const draft = (text: string): NoteDraft => ({
  title: 'Ghi chú',
  background: 'default',
  content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] },
})

describe('NoteAutosaveTracker', () => {
  it('uses the agreed five-second autosave interval', () => {
    expect(NOTE_AUTOSAVE_INTERVAL_MS).toBe(5_000)
  })

  it('rejects images over 5 MB and unsupported types before upload', () => {
    const oversized = new File([new Uint8Array(NOTE_IMAGE_MAX_SIZE_BYTES + 1)], 'large.png', { type: 'image/png' })
    const unsupported = new File([new Uint8Array([1])], 'image.gif', { type: 'image/gif' })

    expect(validateNoteImageFile(oversized)).toContain('5 MB')
    expect(validateNoteImageFile(unsupported)).toContain('JPEG, PNG hoặc WebP')
  })

  it('does not create a save attempt when content has not changed', () => {
    const tracker = new NoteAutosaveTracker()
    tracker.initialize(draft('Ban đầu'))

    expect(tracker.beginSave()).toBeUndefined()
  })

  it('ignores an editor update when the loaded content is unchanged', () => {
    const tracker = new NoteAutosaveTracker()
    tracker.initialize(draft('Ban đầu'))

    expect(tracker.change(draft('Ban đầu'))).toBe(false)
    expect(tracker.hasPendingChanges).toBe(false)
    expect(tracker.beginSave()).toBeUndefined()
  })

  it('becomes clean when the user reverts to the last saved content', () => {
    const tracker = new NoteAutosaveTracker()
    tracker.initialize(draft('Ban đầu'))

    expect(tracker.change(draft('Đã thay đổi'))).toBe(true)
    expect(tracker.change(draft('Ban đầu'))).toBe(false)
    expect(tracker.hasPendingChanges).toBe(false)
    expect(tracker.beginSave()).toBeUndefined()
  })

  it('saves a changed draft once and becomes clean after success', () => {
    const tracker = new NoteAutosaveTracker()
    tracker.initialize(draft('Ban đầu'))
    tracker.change(draft('Đã thay đổi'))

    const attempt = tracker.beginSave()

    expect(attempt?.draft).toEqual(draft('Đã thay đổi'))
    expect(tracker.beginSave()).toBeUndefined()
    expect(attempt && tracker.completeSave(attempt, draft('Đã thay đổi'))).toBe(true)
    expect(tracker.hasPendingChanges).toBe(false)
    expect(tracker.beginSave()).toBeUndefined()
  })

  it('keeps a newer local change pending when an older request finishes last', () => {
    const tracker = new NoteAutosaveTracker()
    tracker.initialize(draft('Ban đầu'))
    tracker.change(draft('Lần một'))
    const attempt = tracker.beginSave()
    tracker.change(draft('Lần hai'))

    expect(attempt && tracker.completeSave(attempt, draft('Lần một'))).toBe(false)
    expect(tracker.hasPendingChanges).toBe(true)
    expect(tracker.beginSave()?.draft).toEqual(draft('Lần hai'))
  })

  it('keeps a failed save pending for the next autosave cycle', () => {
    const tracker = new NoteAutosaveTracker()
    tracker.initialize(draft('Ban đầu'))
    tracker.change(draft('Cần thử lại'))
    expect(tracker.beginSave()).toBeDefined()

    tracker.failSave()

    expect(tracker.hasPendingChanges).toBe(true)
    expect(tracker.beginSave()?.draft).toEqual(draft('Cần thử lại'))
  })
})

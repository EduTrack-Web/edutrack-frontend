import type { NoteContentNode } from '@/modules/notes/models/notes.types'
import type { NoteBackground } from '@/modules/notes/config/notes.config'

export interface NoteDraft {
  title: string
  content: NoteContentNode
  background: NoteBackground
}

export interface NoteSaveAttempt {
  draft: NoteDraft
  snapshot: string
}

const snapshotOf = (draft: NoteDraft): string => JSON.stringify(draft)

export class NoteAutosaveTracker {
  private draft: NoteDraft | null = null
  private savedSnapshot: string | null = null
  private dirty = false
  private saving = false

  initialize(draft: NoteDraft): void {
    this.draft = draft
    this.savedSnapshot = snapshotOf(draft)
    this.dirty = false
    this.saving = false
  }

  change(draft: NoteDraft): boolean {
    this.draft = draft
    this.dirty = snapshotOf(draft) !== this.savedSnapshot
    return this.hasPendingChanges
  }

  beginSave(): NoteSaveAttempt | undefined {
    if (!this.draft || !this.dirty || this.saving) return undefined
    this.saving = true
    return { draft: this.draft, snapshot: snapshotOf(this.draft) }
  }

  completeSave(attempt: NoteSaveAttempt, savedDraft: NoteDraft): boolean {
    this.saving = false
    this.savedSnapshot = snapshotOf(savedDraft)
    if (!this.draft) return true
    if (snapshotOf(this.draft) === attempt.snapshot) this.draft = savedDraft
    this.dirty = snapshotOf(this.draft) !== this.savedSnapshot
    return !this.hasPendingChanges
  }

  failSave(): void {
    this.saving = false
    this.dirty = this.draft !== null && snapshotOf(this.draft) !== this.savedSnapshot
  }

  get currentDraft(): NoteDraft | null {
    return this.draft
  }

  get hasPendingChanges(): boolean {
    return this.dirty || this.saving
  }
}

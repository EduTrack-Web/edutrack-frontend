import type { NoteContentNode } from './notes.types'

export interface NoteDraft {
  title: string
  content: NoteContentNode
}

export interface NoteSaveAttempt {
  draft: NoteDraft
  snapshot: string
}

const snapshotOf = (draft: NoteDraft): string => JSON.stringify(draft)

export class NoteAutosaveTracker {
  private draft: NoteDraft | null = null
  private dirty = false
  private saving = false

  initialize(draft: NoteDraft): void {
    this.draft = draft
    this.dirty = false
    this.saving = false
  }

  change(draft: NoteDraft): void {
    this.draft = draft
    this.dirty = true
  }

  beginSave(): NoteSaveAttempt | undefined {
    if (!this.draft || !this.dirty || this.saving) return undefined
    this.saving = true
    return { draft: this.draft, snapshot: snapshotOf(this.draft) }
  }

  completeSave(attempt: NoteSaveAttempt, savedDraft: NoteDraft): boolean {
    this.saving = false
    if (!this.draft || snapshotOf(this.draft) !== attempt.snapshot) return false
    this.draft = savedDraft
    this.dirty = false
    return true
  }

  failSave(): void {
    this.saving = false
    this.dirty = true
  }

  get currentDraft(): NoteDraft | null {
    return this.draft
  }

  get hasPendingChanges(): boolean {
    return this.dirty
  }
}

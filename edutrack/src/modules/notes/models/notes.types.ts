export interface Note {
  id: string
  title: string
  content: string
  tags: string[]
  updatedAt: string
}

export interface CreateNoteInput {
  title: string
  content: string
  tags?: string[]
}


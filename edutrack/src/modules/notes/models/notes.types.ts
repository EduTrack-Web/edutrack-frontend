export interface NoteContentMark {
  type: 'bold' | 'italic'
}

export interface NoteContentNode {
  type: string
  attrs?: Record<string, unknown>
  content?: NoteContentNode[]
  marks?: NoteContentMark[]
  text?: string
}

export interface NoteSummary {
  id: string
  title: string
  preview: string
  version: number
  createdAt: string
  updatedAt: string
}

export interface NoteDetail extends NoteSummary {
  content: NoteContentNode
}

export interface UpdateNoteInput {
  title: string
  content: NoteContentNode
}

export interface NoteImageUploadResult {
  src: string
  publicId: string
  width: number
  height: number
  format: 'jpg' | 'jpeg' | 'png' | 'webp'
}


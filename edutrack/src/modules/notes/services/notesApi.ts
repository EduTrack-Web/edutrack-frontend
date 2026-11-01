import { request } from '../../../shared/api/httpClient'
import type { ApiSuccess } from '../../auth/models/AuthUser'
import type { CreateNoteInput, Note } from '../models/notes.types'

export const notesApi = {
  getNotes: () => request<ApiSuccess<{ notes: Note[] }>>('/notes'),
  createNote: (payload: CreateNoteInput) =>
    request<ApiSuccess<{ note: Note }>>('/notes', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
}


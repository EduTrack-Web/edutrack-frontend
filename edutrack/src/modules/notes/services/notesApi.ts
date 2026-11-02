import { request } from '../../../shared/api/httpClient'
import type { ApiSuccess } from '../../auth/models/AuthUser'
import type { NoteDetail, NoteImageUploadResult, NoteSummary, UpdateNoteInput } from '../models/notes.types'

export const notesApi = {
  getNotes: () => request<ApiSuccess<{ notes: NoteSummary[] }>>('/notes'),
  createNote: () =>
    request<ApiSuccess<{ note: NoteDetail }>>('/notes', {
      method: 'POST',
    }),
  getNote: (noteId: string) => request<ApiSuccess<{ note: NoteDetail }>>(`/notes/${noteId}`),
  updateNote: (noteId: string, payload: UpdateNoteInput) =>
    request<ApiSuccess<{ note: NoteDetail }>>(`/notes/${noteId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  uploadImage: (file: File) => {
    const body = new FormData()
    body.append('image', file)
    return request<ApiSuccess<{ image: NoteImageUploadResult }>>('/notes/images', { method: 'POST', body })
  },
}


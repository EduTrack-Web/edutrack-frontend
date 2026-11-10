import { request } from '@/shared/api/httpClient'
import type { ApiSuccess } from '@/modules/auth/models/AuthUser'
import type {
  NoteDetail,
  NoteImageUploadResult,
  NoteListItem,
  NoteCollaborator,
  NotePermission,
  NoteShareUser,
  NoteTag,
  TrashedNoteSummary,
  UpdateNoteInput,
} from '@/modules/notes/models/notes.types'

export const notesApi = {
  getNotes: (query = '', tagIds: string[] = []) => {
    const search = new URLSearchParams()
    if (query.trim()) search.set('q', query.trim())
    if (tagIds.length > 0) search.set('tagIds', tagIds.join(','))
    const suffix = search.size > 0 ? `?${search.toString()}` : ''
    return request<ApiSuccess<{ notes: NoteListItem[]; invalidTagIds: string[] }>>(`/notes${suffix}`)
  },
  createNote: () =>
    request<ApiSuccess<{ note: NoteDetail }>>('/notes', {
      method: 'POST',
    }),
  duplicateNote: (noteId: string, language: 'vi' | 'en') =>
    request<ApiSuccess<{ note: NoteDetail }>>(`/notes/${noteId}/duplicate`, {
      method: 'POST',
      body: JSON.stringify({ language }),
    }),
  getNote: (noteId: string) => request<ApiSuccess<{ note: NoteDetail }>>(`/notes/${noteId}`),
  updateNote: (noteId: string, payload: UpdateNoteInput) =>
    request<ApiSuccess<{ note: NoteDetail }>>(`/notes/${noteId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  moveToTrash: (noteId: string) =>
    request<ApiSuccess<{ note: TrashedNoteSummary }>>(`/notes/${noteId}`, { method: 'DELETE' }),
  getTrashedNotes: () => request<ApiSuccess<{ notes: TrashedNoteSummary[] }>>('/notes/trash'),
  restoreNote: (noteId: string) =>
    request<ApiSuccess<{ note: NoteDetail }>>(`/notes/${noteId}/restore`, { method: 'POST' }),
  deletePermanently: (noteId: string) =>
    request<ApiSuccess<Record<string, never>>>(`/notes/${noteId}/permanent`, { method: 'DELETE' }),
  getTags: () => request<ApiSuccess<{ tags: NoteTag[] }>>('/notes/tags'),
  createTag: (name: string, color: string) =>
    request<ApiSuccess<{ tag: NoteTag }>>('/notes/tags', {
      method: 'POST',
      body: JSON.stringify({ name, color }),
    }),
  updateTag: (tagId: string, name: string, color: string) =>
    request<ApiSuccess<{ tag: NoteTag }>>(`/notes/tags/${tagId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name, color }),
    }),
  deleteTag: (tagId: string) =>
    request<ApiSuccess<Record<string, never>>>(`/notes/tags/${tagId}`, { method: 'DELETE' }),
  getNoteTags: (noteId: string) => request<ApiSuccess<{ tags: NoteTag[] }>>(`/notes/${noteId}/tags`),
  setNoteTags: (noteId: string, tagIds: string[]) =>
    request<ApiSuccess<{ tags: NoteTag[] }>>(`/notes/${noteId}/tags`, {
      method: 'PUT',
      body: JSON.stringify({ tagIds }),
    }),
  removeNoteTag: (noteId: string, tagId: string) =>
    request<ApiSuccess<Record<string, never>>>(`/notes/${noteId}/tags/${tagId}`, { method: 'DELETE' }),
  getCollaborators: (noteId: string) =>
    request<ApiSuccess<{ owner: NoteShareUser; collaborators: NoteCollaborator[] }>>(`/notes/${noteId}/shares`),
  searchShareUsers: (noteId: string, query: string) =>
    request<ApiSuccess<{ users: NoteShareUser[] }>>(`/notes/${noteId}/share-users?q=${encodeURIComponent(query)}`),
  setCollaborator: (noteId: string, userId: string, permission: NotePermission) =>
    request<ApiSuccess<{ collaborator: NoteCollaborator }>>(`/notes/${noteId}/shares`, {
      method: 'PUT',
      body: JSON.stringify({ userId, permission }),
    }),
  removeCollaborator: (noteId: string, userId: string) =>
    request<ApiSuccess<Record<string, never>>>(`/notes/${noteId}/shares/${userId}`, { method: 'DELETE' }),
  uploadImage: (file: File) => {
    const body = new FormData()
    body.append('image', file)
    return request<ApiSuccess<{ image: NoteImageUploadResult }>>('/notes/images', { method: 'POST', body })
  },
}


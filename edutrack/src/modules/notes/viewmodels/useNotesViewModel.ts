import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ApiError } from '../../../shared/api/httpClient'
import { useToast } from '../../../shared/viewmodels/useToast'
import {
  NOTE_TAG_COLOR_OPTIONS,
  NOTE_TAG_MAX_PER_NOTE,
  NOTE_TAG_NAME_MAX_LENGTH,
} from '../config/notes.config'
import type { NoteListItem, NoteSummary, NoteTag } from '../models/notes.types'
import { distributeNotesIntoColumns, sortNotesNewestFirst } from '../models/noteLayout'
import { notesApi } from '../services/notesApi'

const TABLET_BREAKPOINT_QUERY = '(min-width: 768px)'

const getNotesColumnCount = (): number =>
  typeof window !== 'undefined' && window.matchMedia(TABLET_BREAKPOINT_QUERY).matches ? 3 : 2

export function useNotesViewModel() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [notes, setNotes] = useState<NoteListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [columnCount, setColumnCount] = useState(getNotesColumnCount)
  const [busyNoteId, setBusyNoteId] = useState<string | null>(null)
  const [noteToTrash, setNoteToTrash] = useState<NoteSummary | null>(null)
  const [activeTagNoteId, setActiveTagNoteId] = useState<string | null>(null)
  const [availableTags, setAvailableTags] = useState<NoteTag[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [isLoadingTags, setIsLoadingTags] = useState(false)
  const [isSavingTags, setIsSavingTags] = useState(false)
  const [isCreatingTag, setIsCreatingTag] = useState(false)
  const [tagName, setTagName] = useState('')
  const [tagColor, setTagColor] = useState<string>(NOTE_TAG_COLOR_OPTIONS[1])
  const [tagFieldError, setTagFieldError] = useState<string | null>(null)
  const [editingTagId, setEditingTagId] = useState<string | null>(null)
  const [tagPendingDelete, setTagPendingDelete] = useState<NoteTag | null>(null)
  const [isDeletingTag, setIsDeletingTag] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTagIds, setFilterTagIds] = useState<string[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const searchRequestIdRef = useRef(0)

  useEffect(() => {
    const mediaQuery = window.matchMedia(TABLET_BREAKPOINT_QUERY)
    const updateColumnCount = () => setColumnCount(mediaQuery.matches ? 3 : 2)

    updateColumnCount()
    mediaQuery.addEventListener('change', updateColumnCount)
    return () => mediaQuery.removeEventListener('change', updateColumnCount)
  }, [])

  const loadNotes = useCallback(async () => {
    const requestId = searchRequestIdRef.current + 1
    searchRequestIdRef.current = requestId
    setIsSearching(true)
    setLoadFailed(false)
    try {
      const result = await notesApi.getNotes(searchQuery, filterTagIds)
      if (searchRequestIdRef.current !== requestId) return
      setNotes(sortNotesNewestFirst(result.data.notes))
      if (result.data.invalidTagIds.length > 0) {
        setFilterTagIds((current) => current.filter((tagId) => !result.data.invalidTagIds.includes(tagId)))
        showToast('Một hoặc nhiều thẻ lọc không còn tồn tại.', 'warning')
      }
    } catch (error) {
      if (searchRequestIdRef.current !== requestId) return
      setLoadFailed(true)
      showToast(error instanceof ApiError ? error.message : 'Không thể tải danh sách ghi chú.', 'error')
    } finally {
      if (searchRequestIdRef.current === requestId) {
        setIsLoading(false)
        setIsSearching(false)
      }
    }
  }, [filterTagIds, searchQuery, showToast])

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(() => { if (active) void loadNotes() }, searchQuery ? 300 : 0)
    return () => { active = false; window.clearTimeout(timer) }
  }, [loadNotes, searchQuery])

  useEffect(() => {
    let active = true
    void notesApi.getTags()
      .then((result) => { if (active) setAvailableTags(result.data.tags) })
      .catch((error: unknown) => {
        if (active) showToast(error instanceof ApiError ? error.message : 'Không thể tải danh sách thẻ.', 'error')
      })
    return () => { active = false }
  }, [showToast])

  const createNote = async () => {
    if (isCreating) return
    setIsCreating(true)
    try {
      const result = await notesApi.createNote()
      navigate(`/notes/${result.data.note.id}`)
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Không thể tạo ghi chú lúc này.', 'error')
      setIsCreating(false)
    }
  }

  const duplicateNote = async (noteId: string) => {
    if (busyNoteId) return
    setBusyNoteId(noteId)
    try {
      const language = localStorage.getItem('edutrack-language') === 'EN' ? 'en' : 'vi'
      const result = await notesApi.duplicateNote(noteId, language)
      setNotes((current) => {
        const sourceTags = current.find((note) => note.id === noteId)?.tags ?? []
        return sortNotesNewestFirst([{ ...result.data.note, tags: sourceTags }, ...current])
      })
      showToast(result.message ?? 'Đã nhân bản ghi chú.', 'success')
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Không thể nhân bản ghi chú.', 'error')
    } finally {
      setBusyNoteId(null)
    }
  }

  const moveToTrash = async () => {
    if (!noteToTrash || busyNoteId) return
    const noteId = noteToTrash.id
    setBusyNoteId(noteId)
    try {
      const result = await notesApi.moveToTrash(noteId)
      setNotes((current) => current.filter((note) => note.id !== noteId))
      setNoteToTrash(null)
      showToast(result.message ?? 'Đã chuyển ghi chú vào thùng rác.', 'success')
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Không thể chuyển ghi chú vào thùng rác.', 'error')
    } finally {
      setBusyNoteId(null)
    }
  }

  const openTagDialog = async (noteId: string) => {
    if (isLoadingTags) return
    setActiveTagNoteId(noteId)
    setIsLoadingTags(true)
    setTagFieldError(null)
    setEditingTagId(null)
    setTagPendingDelete(null)
    try {
      const [allTagsResult, noteTagsResult] = await Promise.all([
        notesApi.getTags(),
        notesApi.getNoteTags(noteId),
      ])
      setAvailableTags(allTagsResult.data.tags)
      setSelectedTagIds(noteTagsResult.data.tags.map((tag) => tag.id))
    } catch (error) {
      setActiveTagNoteId(null)
      showToast(error instanceof ApiError ? error.message : 'Không thể tải danh sách thẻ.', 'error')
    } finally {
      setIsLoadingTags(false)
    }
  }

  const toggleSelectedTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      setSelectedTagIds((current) => current.filter((id) => id !== tagId))
      return
    }
    if (selectedTagIds.length >= NOTE_TAG_MAX_PER_NOTE) {
      showToast(`Mỗi ghi chú chỉ được gắn tối đa ${NOTE_TAG_MAX_PER_NOTE} thẻ.`, 'warning')
      return
    }
    setSelectedTagIds((current) => [...current, tagId])
  }

  const createTag = async () => {
    if (isCreatingTag) return
    const normalizedName = tagName.trim().replace(/\s+/gu, ' ')
    if (!normalizedName) {
      setTagFieldError('Vui lòng nhập tên thẻ.')
      return
    }
    if (normalizedName.length > NOTE_TAG_NAME_MAX_LENGTH) {
      setTagFieldError(`Tên thẻ không được vượt quá ${NOTE_TAG_NAME_MAX_LENGTH} ký tự.`)
      return
    }
    setIsCreatingTag(true)
    setTagFieldError(null)
    try {
      const result = editingTagId
        ? await notesApi.updateTag(editingTagId, normalizedName, tagColor)
        : await notesApi.createTag(normalizedName, tagColor)
      const savedTag = result.data.tag
      setAvailableTags((current) => {
        const withoutSavedTag = current.filter((tag) => tag.id !== savedTag.id)
        return [...withoutSavedTag, savedTag].sort((left, right) => left.name.localeCompare(right.name, 'vi'))
      })
      setNotes((current) => current.map((note) => ({
        ...note,
        tags: note.tags.map((tag) => tag.id === savedTag.id ? savedTag : tag),
      })))
      if (!editingTagId) {
        setSelectedTagIds((current) => current.length < NOTE_TAG_MAX_PER_NOTE ? [...current, savedTag.id] : current)
      }
      setTagName('')
      setEditingTagId(null)
      showToast(result.message ?? (editingTagId ? 'Đã cập nhật thẻ.' : 'Đã tạo và chọn thẻ.'), 'success')
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors?.name) setTagFieldError(error.fieldErrors.name)
      else showToast(error instanceof ApiError ? error.message : 'Không thể tạo thẻ.', 'error')
    } finally {
      setIsCreatingTag(false)
    }
  }

  const deletePersonalTag = async () => {
    if (!tagPendingDelete || isDeletingTag) return
    const tagId = tagPendingDelete.id
    setIsDeletingTag(true)
    try {
      const result = await notesApi.deleteTag(tagId)
      setAvailableTags((current) => current.filter((tag) => tag.id !== tagId))
      setSelectedTagIds((current) => current.filter((id) => id !== tagId))
      setFilterTagIds((current) => current.filter((id) => id !== tagId))
      setNotes((current) => current.map((note) => ({
        ...note,
        tags: note.tags.filter((tag) => tag.id !== tagId),
      })))
      if (editingTagId === tagId) {
        setEditingTagId(null)
        setTagName('')
      }
      setTagPendingDelete(null)
      showToast(result.message ?? 'Đã xóa thẻ.', 'success')
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Không thể xóa thẻ.', 'error')
    } finally {
      setIsDeletingTag(false)
    }
  }

  const saveTags = async () => {
    if (!activeTagNoteId || isSavingTags) return
    setIsSavingTags(true)
    try {
      const result = await notesApi.setNoteTags(activeTagNoteId, selectedTagIds)
      setNotes((current) => current.map((note) => (
        note.id === activeTagNoteId ? { ...note, tags: result.data.tags } : note
      )))
      setActiveTagNoteId(null)
      showToast(result.message ?? 'Gắn thẻ thành công.', 'success')
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Không thể cập nhật thẻ.', 'error')
    } finally {
      setIsSavingTags(false)
    }
  }

  const noteColumns = useMemo(
    () => distributeNotesIntoColumns(notes, columnCount),
    [columnCount, notes],
  )

  return {
    notes,
    noteColumns,
    isLoading,
    isCreating,
    loadFailed,
    busyNoteId,
    noteToTrash,
    activeTagNoteId,
    availableTags,
    selectedTagIds,
    isLoadingTags,
    isSavingTags,
    isCreatingTag,
    tagName,
    tagColor,
    tagFieldError,
    editingTagId,
    tagPendingDelete,
    isDeletingTag,
    searchQuery,
    filterTagIds,
    isSearching,
    hasSearchFilters: searchQuery.trim().length > 0 || filterTagIds.length > 0,
    createNote,
    duplicateNote,
    moveToTrash,
    requestMoveToTrash: (note: NoteSummary) => setNoteToTrash(note),
    cancelMoveToTrash: () => { if (!busyNoteId) setNoteToTrash(null) },
    openTagDialog,
    closeTagDialog: () => { if (!isSavingTags) setActiveTagNoteId(null) },
    toggleSelectedTag,
    updateTagName: (value: string) => { setTagName(value); setTagFieldError(null) },
    updateTagColor: setTagColor,
    createTag,
    startEditTag: (tag: NoteTag) => {
      setEditingTagId(tag.id)
      setTagName(tag.name)
      setTagColor(tag.color)
      setTagFieldError(null)
    },
    cancelEditTag: () => {
      setEditingTagId(null)
      setTagName('')
      setTagFieldError(null)
    },
    requestDeleteTag: setTagPendingDelete,
    cancelDeleteTag: () => { if (!isDeletingTag) setTagPendingDelete(null) },
    deletePersonalTag,
    saveTags,
    updateSearchQuery: setSearchQuery,
    toggleFilterTag: (tagId: string) => setFilterTagIds((current) => (
      current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId]
    )),
    clearSearchFilters: () => { setSearchQuery(''); setFilterTagIds([]) },
    clearTagFilters: () => setFilterTagIds([]),
    openTrash: () => navigate('/notes/trash'),
    openNote: (noteId: string) => navigate(`/notes/${noteId}`),
    retry: loadNotes,
  }
}


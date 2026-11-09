import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { ApiError } from '../../../shared/api/httpClient'
import { useToast } from '../../../shared/viewmodels/useToast'
import {
  NOTE_AUTOSAVE_INTERVAL_MS,
  NOTE_TAG_COLOR_OPTIONS,
  NOTE_TAG_MAX_PER_NOTE,
  NOTE_TAG_NAME_MAX_LENGTH,
  validateNoteImageFile,
  type NoteBackground,
} from '../config/notes.config'
import { NoteAutosaveTracker, type NoteDraft } from '../models/noteAutosave'
import type { NoteContentNode, NoteDetail, NoteImageUploadResult, NoteTag } from '../models/notes.types'
import { notesApi } from '../services/notesApi'

export type NoteSaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error'

export function useNoteEditorViewModel() {
  const { noteId = '' } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [note, setNote] = useState<NoteDetail | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState<NoteContentNode | null>(null)
  const [background, setBackground] = useState<NoteBackground>('default')
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<NoteSaveStatus>('idle')
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [noteTags, setNoteTags] = useState<NoteTag[]>([])
  const [availableTags, setAvailableTags] = useState<NoteTag[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false)
  const [isLoadingTags, setIsLoadingTags] = useState(false)
  const [isSavingTags, setIsSavingTags] = useState(false)
  const [isCreatingTag, setIsCreatingTag] = useState(false)
  const [tagName, setTagName] = useState('')
  const [tagColor, setTagColor] = useState<string>(NOTE_TAG_COLOR_OPTIONS[1])
  const [tagFieldError, setTagFieldError] = useState<string | null>(null)
  const [editingTagId, setEditingTagId] = useState<string | null>(null)
  const [tagPendingDelete, setTagPendingDelete] = useState<NoteTag | null>(null)
  const [isDeletingTag, setIsDeletingTag] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)
  const autosaveRef = useRef(new NoteAutosaveTracker())
  const lastErrorSnapshotRef = useRef<string | null>(null)

  const loadNote = useCallback(async () => {
    if (!noteId) {
      setLoadError('Không tìm thấy ghi chú.')
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setLoadError(null)
    try {
      const [result, tagsResult] = await Promise.all([notesApi.getNote(noteId), notesApi.getNoteTags(noteId)])
      const loaded = result.data.note
      const draft = { title: loaded.title, content: loaded.content, background: loaded.background }
      setNote(loaded)
      setTitle(loaded.title)
      setContent(loaded.content)
      setBackground(loaded.background)
      setNoteTags(tagsResult.data.tags)
      autosaveRef.current.initialize(draft)
      setSaveStatus('saved')
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : 'Không thể tải ghi chú.')
    } finally {
      setIsLoading(false)
    }
  }, [noteId])

  useEffect(() => {
    let active = true
    if (!noteId) {
      Promise.resolve().then(() => {
        if (active) {
          setLoadError('Không tìm thấy ghi chú.')
          setIsLoading(false)
        }
      })
      return () => { active = false }
    }
    void Promise.all([notesApi.getNote(noteId), notesApi.getNoteTags(noteId)])
      .then(([result, tagsResult]) => {
        if (!active) return
        const loaded = result.data.note
        const draft = { title: loaded.title, content: loaded.content, background: loaded.background }
        setNote(loaded)
        setTitle(loaded.title)
        setContent(loaded.content)
        setBackground(loaded.background)
        setNoteTags(tagsResult.data.tags)
        autosaveRef.current.initialize(draft)
        setSaveStatus('saved')
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof ApiError ? error.message : 'Không thể tải ghi chú.')
      })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [noteId])

  const markChanged = useCallback((nextDraft: NoteDraft) => {
    if (note && !note.access.canEdit) return
    const hasPendingChanges = autosaveRef.current.change(nextDraft)
    lastErrorSnapshotRef.current = null
    setSaveStatus(hasPendingChanges ? 'unsaved' : 'saved')
  }, [note])

  const initializeEditorContent = useCallback((value: NoteContentNode) => {
    const currentDraft = autosaveRef.current.currentDraft
    if (!currentDraft) return
    const editorDraft = { ...currentDraft, content: value }
    autosaveRef.current.initialize(editorDraft)
    setContent(value)
    lastErrorSnapshotRef.current = null
    setSaveStatus('saved')
  }, [])

  const updateTitle = (value: string) => {
    setTitle(value)
    const currentContent = autosaveRef.current.currentDraft?.content ?? content
    if (currentContent) markChanged({ title: value, content: currentContent, background: autosaveRef.current.currentDraft?.background ?? background })
  }

  const updateContent = (value: NoteContentNode) => {
    setContent(value)
    markChanged({
      title: autosaveRef.current.currentDraft?.title ?? title,
      content: value,
      background: autosaveRef.current.currentDraft?.background ?? background,
    })
  }

  const updateBackground = (value: NoteBackground) => {
    setBackground(value)
    const currentDraft = autosaveRef.current.currentDraft
    if (currentDraft) markChanged({ ...currentDraft, background: value })
  }

  const save = useCallback(async (): Promise<boolean> => {
    if (!noteId) return false
    if (note && !note.access.canEdit) return true
    const attempt = autosaveRef.current.beginSave()
    if (!attempt) return !autosaveRef.current.hasPendingChanges
    setSaveStatus('saving')
    try {
      const result = await notesApi.updateNote(noteId, attempt.draft)
      const savedDraft = {
        title: result.data.note.title,
        content: result.data.note.content,
        background: result.data.note.background,
      }
      const isFullySaved = autosaveRef.current.completeSave(attempt, savedDraft)
      if (isFullySaved) {
        setTitle(savedDraft.title)
        setContent(savedDraft.content)
        setBackground(savedDraft.background)
        setSaveStatus('saved')
      } else {
        setSaveStatus('unsaved')
      }
      setNote(result.data.note)
      lastErrorSnapshotRef.current = null
      return isFullySaved
    } catch (error) {
      autosaveRef.current.failSave()
      const hasPendingChanges = autosaveRef.current.hasPendingChanges
      setSaveStatus(hasPendingChanges ? 'error' : 'saved')
      if (hasPendingChanges && lastErrorSnapshotRef.current !== attempt.snapshot) {
        showToast(error instanceof ApiError ? error.message : 'Không thể lưu ghi chú. Hệ thống sẽ thử lại.', 'error')
        lastErrorSnapshotRef.current = attempt.snapshot
      }
      return !hasPendingChanges
    }
  }, [note, noteId, showToast])

  useEffect(() => {
    const timer = window.setInterval(() => { void save() }, NOTE_AUTOSAVE_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [save])

  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!autosaveRef.current.hasPendingChanges) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [])

  const uploadImage = async (file: File): Promise<NoteImageUploadResult | undefined> => {
    const validationError = validateNoteImageFile(file)
    if (validationError) {
      showToast(validationError, 'error')
      return undefined
    }
    setIsUploadingImage(true)
    try {
      const result = await notesApi.uploadImage(file)
      return result.data.image
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Không thể tải ảnh lên.', 'error')
      return undefined
    } finally {
      setIsUploadingImage(false)
    }
  }

  const moveToTrash = async () => {
    if (!noteId || isDeleting) return
    if (note?.access.role !== 'owner') {
      showToast('Chỉ chủ sở hữu mới có thể xóa ghi chú.', 'warning')
      return
    }
    setIsDeleting(true)
    const isSaved = await save()
    if (!isSaved) {
      showToast('Vui lòng đợi ghi chú lưu xong rồi thử xóa lại.', 'warning')
      setIsDeleting(false)
      return
    }
    try {
      const result = await notesApi.moveToTrash(noteId)
      setIsDeleteDialogOpen(false)
      showToast(result.message ?? 'Đã chuyển ghi chú vào thùng rác.', 'success')
      navigate('/notes', { replace: true })
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Không thể chuyển ghi chú vào thùng rác.', 'error')
      setIsDeleting(false)
    }
  }

  const openTagDialog = async () => {
    if (!noteId || isLoadingTags) return
    setIsTagDialogOpen(true)
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
      setNoteTags(noteTagsResult.data.tags)
      setSelectedTagIds(noteTagsResult.data.tags.map((tag) => tag.id))
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Không thể tải danh sách thẻ.', 'error')
      setIsTagDialogOpen(false)
    } finally {
      setIsLoadingTags(false)
    }
  }

  const toggleSelectedTag = (tagId: string) => {
    setSelectedTagIds((current) => {
      if (current.includes(tagId)) return current.filter((id) => id !== tagId)
      if (current.length >= NOTE_TAG_MAX_PER_NOTE) {
        showToast(`Mỗi ghi chú chỉ được gắn tối đa ${NOTE_TAG_MAX_PER_NOTE} thẻ.`, 'warning')
        return current
      }
      return [...current, tagId]
    })
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
      setNoteTags((current) => current.map((tag) => tag.id === savedTag.id ? savedTag : tag))
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
      setNoteTags((current) => current.filter((tag) => tag.id !== tagId))
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
    if (!noteId || isSavingTags) return
    setIsSavingTags(true)
    try {
      const result = await notesApi.setNoteTags(noteId, selectedTagIds)
      setNoteTags(result.data.tags)
      setIsTagDialogOpen(false)
      showToast(result.message ?? 'Gắn thẻ thành công.', 'success')
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Không thể cập nhật thẻ.', 'error')
    } finally {
      setIsSavingTags(false)
    }
  }

  const removeTag = async (tagId: string) => {
    if (!noteId) return
    try {
      const result = await notesApi.removeNoteTag(noteId, tagId)
      setNoteTags((current) => current.filter((tag) => tag.id !== tagId))
      showToast(result.message ?? 'Đã bỏ thẻ khỏi ghi chú.', 'success')
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Không thể bỏ thẻ.', 'error')
    }
  }

  const duplicateNote = async () => {
    if (!noteId || isDuplicating) return
    setIsDuplicating(true)
    const isSaved = await save()
    if (!isSaved) {
      showToast('Vui lòng đợi ghi chú lưu xong rồi thử nhân bản lại.', 'warning')
      setIsDuplicating(false)
      return
    }
    try {
      const language = localStorage.getItem('edutrack-language') === 'EN' ? 'en' : 'vi'
      const result = await notesApi.duplicateNote(noteId, language)
      showToast(result.message ?? 'Đã nhân bản ghi chú.', 'success')
      navigate(`/notes/${result.data.note.id}`)
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Không thể nhân bản ghi chú.', 'error')
      setIsDuplicating(false)
    }
  }

  return {
    note,
    title,
    content,
    background,
    isLoading,
    loadError,
    saveStatus,
    isUploadingImage,
    isDeleteDialogOpen,
    isDeleting,
    noteTags,
    availableTags,
    selectedTagIds,
    isTagDialogOpen,
    isLoadingTags,
    isSavingTags,
    isCreatingTag,
    tagName,
    tagColor,
    tagFieldError,
    editingTagId,
    tagPendingDelete,
    isDeletingTag,
    isDuplicating,
    hasUnsavedChanges: saveStatus === 'unsaved' || saveStatus === 'saving' || saveStatus === 'error',
    updateTitle,
    updateContent,
    initializeEditorContent,
    updateBackground,
    saveNow: save,
    openDeleteDialog: () => setIsDeleteDialogOpen(true),
    closeDeleteDialog: () => { if (!isDeleting) setIsDeleteDialogOpen(false) },
    moveToTrash,
    openTagDialog,
    closeTagDialog: () => { if (!isSavingTags) setIsTagDialogOpen(false) },
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
    removeTag,
    duplicateNote,
    uploadImage,
    retry: loadNote,
    goToNotes: () => navigate('/notes'),
  }
}

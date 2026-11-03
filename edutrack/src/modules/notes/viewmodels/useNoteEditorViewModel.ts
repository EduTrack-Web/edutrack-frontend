import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { ApiError } from '../../../shared/api/httpClient'
import { useToast } from '../../../shared/viewmodels/useToast'
import {
  NOTE_AUTOSAVE_INTERVAL_MS,
  validateNoteImageFile,
  type NoteBackground,
} from '../config/notes.config'
import { NoteAutosaveTracker, type NoteDraft } from '../models/noteAutosave'
import type { NoteContentNode, NoteDetail, NoteImageUploadResult } from '../models/notes.types'
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
      const result = await notesApi.getNote(noteId)
      const loaded = result.data.note
      const draft = { title: loaded.title, content: loaded.content, background: loaded.background }
      setNote(loaded)
      setTitle(loaded.title)
      setContent(loaded.content)
      setBackground(loaded.background)
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
    void notesApi.getNote(noteId)
      .then((result) => {
        if (!active) return
        const loaded = result.data.note
        const draft = { title: loaded.title, content: loaded.content, background: loaded.background }
        setNote(loaded)
        setTitle(loaded.title)
        setContent(loaded.content)
        setBackground(loaded.background)
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
    autosaveRef.current.change(nextDraft)
    lastErrorSnapshotRef.current = null
    setSaveStatus('unsaved')
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

  const save = useCallback(async () => {
    if (!noteId) return
    const attempt = autosaveRef.current.beginSave()
    if (!attempt) return
    setSaveStatus('saving')
    try {
      const result = await notesApi.updateNote(noteId, attempt.draft)
      const savedDraft = {
        title: result.data.note.title,
        content: result.data.note.content,
        background: result.data.note.background,
      }
      if (autosaveRef.current.completeSave(attempt, savedDraft)) {
        setTitle(savedDraft.title)
        setContent(savedDraft.content)
        setBackground(savedDraft.background)
        setSaveStatus('saved')
      } else {
        setSaveStatus('unsaved')
      }
      setNote(result.data.note)
      lastErrorSnapshotRef.current = null
    } catch (error) {
      autosaveRef.current.failSave()
      setSaveStatus('error')
      if (lastErrorSnapshotRef.current !== attempt.snapshot) {
        showToast(error instanceof ApiError ? error.message : 'Không thể lưu ghi chú. Hệ thống sẽ thử lại.', 'error')
        lastErrorSnapshotRef.current = attempt.snapshot
      }
    }
  }, [noteId, showToast])

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

  return {
    note,
    title,
    content,
    background,
    isLoading,
    loadError,
    saveStatus,
    isUploadingImage,
    hasUnsavedChanges: saveStatus === 'unsaved' || saveStatus === 'saving' || saveStatus === 'error',
    updateTitle,
    updateContent,
    updateBackground,
    saveNow: save,
    uploadImage,
    retry: loadNote,
    goToNotes: () => navigate('/notes'),
  }
}

import { useEffect, useState } from 'react'
import { Icon } from '../../../../shared/components/Icon'
import type { CalendarCategory, CreateCategoryInput } from '../../models/calendar.types'
import { validateCategoryForm } from '../../models/calendarValidation'
import { calendarApi } from '../../services/calendarApi'
import { EXTENDED_CALENDAR_COLORS } from '../../viewmodels/useEventModalViewModel'

interface CategoryModalProps {
  isOpen: boolean
  initialCategory?: CalendarCategory | null
  onClose: () => void
  onSaved: () => void
}

export function CategoryModal({
  isOpen,
  initialCategory,
  onClose,
  onSaved,
}: CategoryModalProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(EXTENDED_CALENDAR_COLORS[0])
  const [description, setDescription] = useState('')

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [generalError, setGeneralError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(() => {
      if (!active) return

      if (isOpen) {
        if (initialCategory) {
          setName(initialCategory.name)
          setColor(initialCategory.color)
          setDescription(initialCategory.description ?? '')
        } else {
          setName('')
          setColor(EXTENDED_CALENDAR_COLORS[0])
          setDescription('')
        }
        setErrors({})
        setGeneralError(null)
      }
    }, 0)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [isOpen, initialCategory])

  if (!isOpen) return null

  const isEditing = Boolean(initialCategory)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setGeneralError(null)

    const payload: CreateCategoryInput = {
      name,
      color,
      description,
    }

    const valErrors = validateCategoryForm(payload)
    if (Object.keys(valErrors).length > 0) {
      setErrors(valErrors)
      return
    }

    try {
      setIsSubmitting(true)
      if (initialCategory) {
        await calendarApi.updateCategory(initialCategory.id, payload)
      } else {
        await calendarApi.createCategory(payload)
      }
      onSaved()
      onClose()
    } catch (err: unknown) {
      const maybeErr = err as { fieldErrors?: Record<string, string>; message?: string }
      if (maybeErr.fieldErrors) {
        setErrors(maybeErr.fieldErrors)
      } else {
        setGeneralError(maybeErr.message || 'Không thể lưu lịch lúc này.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-2xs transition-opacity sm:p-6"
      role="dialog"
    >
      <div
        className="relative flex w-full max-w-md flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-[#021024]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {isEditing ? 'Chỉnh sửa lịch' : 'Tạo lịch mới'}
          </h2>
          <button
            aria-label="Đóng"
            className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
            onClick={onClose}
            type="button"
          >
            <Icon className="size-4" name="close" />
          </button>
        </div>

        {generalError && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300">
            {generalError}
          </div>
        )}

        {/* Form Body */}
        <form className="space-y-4" noValidate onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300" htmlFor="category-name">
              Tên lịch <span className="text-rose-500">*</span>
            </label>
            <input
              aria-invalid={Boolean(errors.name)}
              className={`mt-1.5 w-full rounded-xl border bg-slate-50/70 px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-hidden transition-all focus:bg-white focus:ring-2 dark:bg-white/5 dark:text-white ${
                errors.name
                  ? 'border-rose-500 focus:ring-rose-500/20'
                  : 'border-slate-200 focus:border-blue-600 focus:ring-blue-500/20 dark:border-white/10'
              }`}
              id="category-name"
              onChange={(e) => {
                setName(e.target.value)
                setErrors((p) => { const n = { ...p }; delete n.name; return n })
              }}
              placeholder="Ví dụ: Học tập, Công việc, Thể thao..."
              type="text"
              value={name}
            />
            {errors.name && <p className="mt-1 text-xs text-rose-500">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300" htmlFor="category-desc">
              Mô tả
            </label>
            <textarea
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-sm text-slate-900 outline-hidden transition-all focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
              id="category-desc"
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Thêm mô tả về loại lịch này..."
              rows={3}
              value={description}
            />
          </div>

          {/* Chọn màu sắc đa dạng */}
          <div>
            <div className="flex items-center justify-between">
              <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Màu nhận diện
              </span>
              <label className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400">
                <Icon className="size-3.5" name="palette" />
                <span>Màu tùy chọn</span>
                <input
                  aria-label="Chọn màu tùy chọn"
                  className="sr-only"
                  onChange={(e) => setColor(e.target.value)}
                  type="color"
                  value={color}
                />
              </label>
            </div>

            <div className="mt-2.5 grid grid-cols-6 gap-2 sm:grid-cols-9">
              {EXTENDED_CALENDAR_COLORS.map((c) => (
                <button
                  aria-label={`Màu ${c}`}
                  className={`size-7 rounded-full transition-transform ${
                    (color ?? '').toLowerCase() === c.toLowerCase()
                      ? 'scale-115 ring-2 ring-blue-600 ring-offset-2'
                      : 'hover:scale-105'
                  }`}
                  key={c}
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  type="button"
                />
              ))}
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
              onClick={onClose}
              type="button"
            >
              Hủy
            </button>
            <button
              className="rounded-full bg-blue-600 px-6 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Đang lưu...' : isEditing ? 'Lưu thay đổi' : 'Tạo lịch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

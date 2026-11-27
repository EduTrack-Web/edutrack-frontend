import { useEffect, useState } from 'react'
import { Icon } from '../../../../shared/components/Icon'
import { useAuth } from '@/modules/auth/viewmodels/useAuth'
import type { CalendarCategory, CalendarSettings, CategoryMember, CreateCategoryInput, ReminderItem, ReminderMethod } from '../../models/calendar.types'
import { validateCategoryForm, validateGuestInput } from '../../models/calendarValidation'
import { COMMON_TIMEZONES } from '../../models/calendarConstants'
import { calendarApi } from '../../services/calendarApi'
import { EXTENDED_CALENDAR_COLORS, type ReminderUnit } from '../../viewmodels/useEventModalViewModel'

const DEFAULT_SETTINGS: CalendarSettings = {
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh',
  weekStartsOn: 0,
  workingHoursStart: '08:00',
  workingHoursEnd: '17:00',
  defaultDurationMinutes: 60,
  reminders: [{ method: 'in-app', minutesBefore: 15 }],
  privacy: 'private',
  archived: false,
  sharedWith: [],
}

const QUICK_DURATIONS = [15, 30, 45, 60, 90, 120]

interface ReminderFormRow {
  id: string
  method: ReminderMethod
  quantity: number
  unit: ReminderUnit
}

function minutesToFormRow(minutes: number, method: ReminderMethod, id: string): ReminderFormRow {
  if (minutes >= 10080 && minutes % 10080 === 0) {
    return { id, method, quantity: minutes / 10080, unit: 'weeks' }
  }
  if (minutes >= 1440 && minutes % 1440 === 0) {
    return { id, method, quantity: minutes / 1440, unit: 'days' }
  }
  if (minutes >= 60 && minutes % 60 === 0) {
    return { id, method, quantity: minutes / 60, unit: 'hours' }
  }
  return { id, method, quantity: Math.max(1, minutes), unit: 'minutes' }
}

function formRowToMinutes(quantity: number, unit: ReminderUnit): number {
  const qty = Math.max(1, Number(quantity) || 1)
  switch (unit) {
    case 'weeks':
      return qty * 10080
    case 'days':
      return qty * 1440
    case 'hours':
      return qty * 60
    case 'minutes':
    default:
      return qty
  }
}

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
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [color, setColor] = useState(EXTENDED_CALENDAR_COLORS[0] ?? '#2563EB')
  const [description, setDescription] = useState('')

  const [timeZone, setTimeZone] = useState(DEFAULT_SETTINGS.timeZone)
  const [defaultDurationMinutes, setDefaultDurationMinutes] = useState(DEFAULT_SETTINGS.defaultDurationMinutes)

  const [reminderRows, setReminderRows] = useState<ReminderFormRow[]>([])

  const [privacy, setPrivacy] = useState<'private' | 'public'>('private')
  const [publicToken, setPublicToken] = useState<string | null>(null)
  const [isRegeneratingPublicToken, setIsRegeneratingPublicToken] = useState(false)
  const [publicLinkCopied, setPublicLinkCopied] = useState(false)
  const [archived, setArchived] = useState(false)
  const [sharedWith, setSharedWith] = useState<CategoryMember[]>([])
  const [newGuestEmail, setNewGuestEmail] = useState('')
  const [newGuestRole, setNewGuestRole] = useState<'viewer' | 'editor' | 'admin'>('viewer')
  const [guestEmailError, setGuestEmailError] = useState<string | null>(null)
  const [isResolvingGuest, setIsResolvingGuest] = useState(false)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(() => {
      if (!active) return

      if (isOpen) {
        setErrors({})
        setGeneralError(null)
        setShowDeleteConfirm(false)
        setShowLeaveConfirm(false)
        setMemberToRemove(null)
        setNewGuestEmail('')
        setGuestEmailError(null)

        if (initialCategory) {
          setName(initialCategory.name)
          setColor(initialCategory.color || EXTENDED_CALENDAR_COLORS[0] || '#2563EB')
          setDescription(initialCategory.description ?? '')

          const s = initialCategory.settings ?? DEFAULT_SETTINGS
          setTimeZone(s.timeZone || DEFAULT_SETTINGS.timeZone)
          setDefaultDurationMinutes(s.defaultDurationMinutes || DEFAULT_SETTINGS.defaultDurationMinutes)
          setPrivacy(s.privacy || 'private')
          setPublicToken(initialCategory.publicToken ?? null)
          setPublicLinkCopied(false)
          setArchived(Boolean(s.archived))
          setSharedWith(initialCategory.sharedWith ?? s.sharedWith ?? [])

          if (Array.isArray(s.reminders) && s.reminders.length > 0) {
            setReminderRows(
              s.reminders.map((r, i) => minutesToFormRow(r.minutesBefore, r.method, `rem-${i}-${Date.now()}`)),
            )
          } else {
            setReminderRows([{ id: 'rem-default', method: 'in-app', quantity: 15, unit: 'minutes' }])
          }
        } else {
          setName('')
          setColor(EXTENDED_CALENDAR_COLORS[0] || '#2563EB')
          setDescription('')
          setTimeZone(DEFAULT_SETTINGS.timeZone)
          setDefaultDurationMinutes(DEFAULT_SETTINGS.defaultDurationMinutes)
          setPrivacy('private')
          setPublicToken(null)
          setPublicLinkCopied(false)
          setArchived(false)
          setSharedWith([])
          setReminderRows([{ id: 'rem-default', method: 'in-app', quantity: 15, unit: 'minutes' }])
        }
      }
    }, 0)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [isOpen, initialCategory])

  if (!isOpen) return null

  const isEditing = Boolean(initialCategory)
  const myRole = initialCategory?.myRole ?? (initialCategory?.isShared ? 'viewer' : 'owner')
  const canEditCategory = !initialCategory || myRole === 'owner' || myRole === 'admin'
  const canDeleteCategory = Boolean(initialCategory && myRole === 'owner')

  const handleAddReminder = () => {
    if (reminderRows.length >= 10) return
    const newRow: ReminderFormRow = {
      id: `rem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      method: 'in-app',
      quantity: 15,
      unit: 'minutes',
    }
    setReminderRows((prev) => [...prev, newRow])
  }

  const handleRemoveReminder = (id: string) => {
    setReminderRows((prev) => prev.filter((r) => r.id !== id))
  }

  const handleUpdateReminder = (
    id: string,
    field: 'method' | 'quantity' | 'unit',
    val: ReminderMethod | number | ReminderUnit,
  ) => {
    setReminderRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r
        return { ...r, [field]: val }
      }),
    )
  }

  const resolveSharedMember = async (rawInput: string): Promise<CategoryMember | null> => {
    const error = validateGuestInput(
      rawInput,
      sharedWith.map((g) => ({ email: g.email })),
      user?.email,
      undefined,
      true,
    )
    if (error) {
      setGuestEmailError(error)
      return null
    }

    try {
      setIsResolvingGuest(true)
      const res = await calendarApi.resolveGuest(rawInput.trim())
      const resolvedEmail = res.data?.email?.trim().toLowerCase()
      if (!resolvedEmail) {
        setGuestEmailError('Không tìm thấy người dùng')
        return null
      }
      if (sharedWith.some((g) => g.email.trim().toLowerCase() === resolvedEmail)) {
        setGuestEmailError('Người này đã có trong danh sách chia sẻ')
        return null
      }
      return { email: resolvedEmail, role: newGuestRole }
    } catch (err: unknown) {
      const maybeErr = err as { message?: string }
      setGuestEmailError(maybeErr.message || 'Không tìm thấy người dùng')
      return null
    } finally {
      setIsResolvingGuest(false)
    }
  }

  const handleAddGuest = async () => {
    if (!canEditCategory || isResolvingGuest) return
    const resolved = await resolveSharedMember(newGuestEmail)
    if (!resolved) return
    setSharedWith((prev) => [...prev, resolved])
    setNewGuestEmail('')
    setGuestEmailError(null)
  }

  const handleRemoveGuest = (email: string) => {
    setSharedWith((prev) => prev.filter((g) => g.email !== email))
  }

  const handleConfirmRemoveMember = () => {
    if (memberToRemove) {
      handleRemoveGuest(memberToRemove)
      setMemberToRemove(null)
    }
  }

  const handleUpdateGuestRole = (email: string, role: 'viewer' | 'editor' | 'admin') => {
    setSharedWith((prev) => prev.map((g) => (g.email === email ? { ...g, role } : g)))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canEditCategory) return
    setGeneralError(null)

    let finalSharedWith = [...sharedWith]
    if (newGuestEmail.trim()) {
      const resolved = await resolveSharedMember(newGuestEmail)
      if (!resolved) return
      finalSharedWith = [...finalSharedWith, resolved]
      setSharedWith(finalSharedWith)
      setNewGuestEmail('')
      setGuestEmailError(null)
    }

    const convertedReminders: ReminderItem[] = reminderRows.map((r) => ({
      method: r.method,
      minutesBefore: formRowToMinutes(r.quantity, r.unit),
    }))

    const settingsPayload: CalendarSettings = {
      timeZone,
      weekStartsOn: 0,
      workingHoursStart: '08:00',
      workingHoursEnd: '17:00',
      defaultDurationMinutes: Math.max(5, Math.min(1440, Number(defaultDurationMinutes) || 60)),
      reminders: convertedReminders,
      privacy,
      archived,
      sharedWith: finalSharedWith,
    }

    const payload: CreateCategoryInput = {
      name,
      color,
      description,
      settings: settingsPayload,
      sharedWith: finalSharedWith,
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

  const handleDeleteCalendar = () => {
    if (!initialCategory) return
    setShowDeleteConfirm(true)
  }

  const handleConfirmDeleteCalendar = async () => {
    if (!initialCategory) return
    try {
      setIsSubmitting(true)
      await calendarApi.deleteCategory(initialCategory.id)
      setShowDeleteConfirm(false)
      onSaved()
      onClose()
    } catch {
      setGeneralError('Không thể xóa lịch lúc này. Vui lòng thử lại.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmLeaveCategory = async () => {
    if (!initialCategory) return
    try {
      setIsSubmitting(true)
      if (initialCategory.isSubscribed) {
        await calendarApi.unsubscribePublicCalendar(initialCategory.id)
      } else {
        await calendarApi.leaveCategory(initialCategory.id)
      }
      setShowLeaveConfirm(false)
      onSaved()
      onClose()
    } catch (err: unknown) {
      const maybeErr = err as { message?: string }
      setGeneralError(maybeErr.message || 'Không thể rời khỏi lịch lúc này. Vui lòng thử lại.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopyPublicLink = async () => {
    if (!publicToken) return
    const url = `${window.location.origin}/calendar/public/${publicToken}`
    try {
      await navigator.clipboard.writeText(url)
      setPublicLinkCopied(true)
      window.setTimeout(() => setPublicLinkCopied(false), 2000)
    } catch {
      // ignore clipboard errors
    }
  }

  const handleRegeneratePublicToken = async () => {
    if (!initialCategory) return
    try {
      setIsRegeneratingPublicToken(true)
      const res = await calendarApi.regeneratePublicToken(initialCategory.id)
      if (res.data?.publicToken) {
        setPublicToken(res.data.publicToken)
        onSaved()
      }
    } catch (err: unknown) {
      const maybeErr = err as { message?: string }
      setGeneralError(maybeErr.message || 'Không thể tạo liên kết công khai mới.')
    } finally {
      setIsRegeneratingPublicToken(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">

      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />


      <div
        aria-modal="true"
        className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200/80 bg-white shadow-2xl dark:border-white/10 dark:bg-[#021024]"
        role="dialog"
      >

        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-white/10">
          <div className="flex items-center gap-3">
            <span
              className="grid size-9 place-items-center rounded-xl text-white shadow-xs"
              style={{ backgroundColor: color }}
            >
              <Icon className="size-5" name="calendar" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {isEditing ? `Cài đặt lịch: ${initialCategory?.name}` : 'Tạo lịch mới'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tùy chỉnh thông tin, múi giờ, thông báo và chia sẻ khách
              </p>
            </div>
          </div>

          <button
            aria-label="Đóng"
            className="grid size-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
            onClick={onClose}
            type="button"
          >
            <Icon className="size-4.5" name="close" />
          </button>
        </div>


        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="flex-1 space-y-7 overflow-y-auto px-6 py-5">
            {generalError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300">
                {generalError}
              </div>
            )}


            <section className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2 dark:border-white/10">
                <span className="grid size-5.5 place-items-center rounded-md bg-blue-50 text-xs font-bold text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                  1
                </span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Thông tin chung
                </h3>
              </div>


              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300" htmlFor="category-name">
                  Tên lịch <span className="text-rose-500">*</span>
                </label>
                <input
                  aria-describedby={errors.name ? 'category-name-error' : undefined}
                  aria-invalid={Boolean(errors.name)}
                  className={`mt-1.5 w-full rounded-xl border bg-slate-50/70 px-3.5 py-2.5 text-xs text-slate-900 outline-hidden transition-all focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 disabled:cursor-not-allowed dark:bg-white/5 dark:text-white ${errors.name ? 'border-rose-500 dark:border-rose-500' : 'border-slate-200 dark:border-white/10'
                    }`}
                  disabled={!canEditCategory}
                  id="category-name"
                  maxLength={100}
                  onChange={(e) => {
                    setName(e.target.value)
                    setErrors((prev) => {
                      const next = { ...prev }
                      delete next.name
                      return next
                    })
                  }}
                  placeholder="Ví dụ: Lịch học kỳ 1, Ôn thi chứng chỉ, CLB Tin học..."
                  type="text"
                  value={name}
                />
                {errors.name && (
                  <p className="mt-1 text-xs font-semibold text-rose-500" id="category-name-error">
                    {errors.name}
                  </p>
                )}
              </div>


              <div>
                <div className="flex items-center justify-between">
                  <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Màu sắc nhận diện
                  </span>
                  <label className={`flex items-center gap-1.5 text-xs font-semibold ${canEditCategory ? 'cursor-pointer text-blue-600 hover:text-blue-700 dark:text-blue-400' : 'opacity-50 cursor-not-allowed text-slate-400'}`}>
                    <Icon className="size-3.5" name="palette" />
                    <span>Màu tùy chọn</span>
                    <input
                      aria-label="Chọn màu tùy chọn"
                      className="sr-only"
                      disabled={!canEditCategory}
                      onChange={(e) => setColor(e.target.value)}
                      type="color"
                      value={color}
                    />
                  </label>
                </div>

                <div className="mt-2 grid grid-cols-6 gap-2 sm:grid-cols-9">
                  {EXTENDED_CALENDAR_COLORS.map((c) => {
                    const isSelected = (color || '').toLowerCase() === c.toLowerCase()
                    return (
                      <button
                        aria-label={`Màu ${c}`}
                        className={`size-8 rounded-full transition-transform flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed ${canEditCategory ? 'hover:scale-110' : ''
                          } ${isSelected ? 'ring-2 ring-blue-600 ring-offset-2 scale-110' : ''
                          }`}
                        disabled={!canEditCategory}
                        key={c}
                        onClick={() => setColor(c)}
                        style={{ backgroundColor: c }}
                        type="button"
                      >
                        {isSelected && <Icon className="size-4 text-white" name="check" />}
                      </button>
                    )
                  })}
                </div>


                <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/80 p-2.5 dark:border-white/5 dark:bg-white/5">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Xem trước hiển thị:</span>
                  <span
                    className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-white shadow-2xs"
                    style={{ backgroundColor: color }}
                  >
                    <span className="size-2 rounded-full bg-white/80" />
                    <span>{name.trim() || 'Tên lịch của bạn'}</span>
                  </span>
                </div>
              </div>


              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300" htmlFor="category-desc">
                  Mô tả / Ghi chú mục đích
                </label>
                <textarea
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs text-slate-900 outline-hidden transition-all focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 disabled:cursor-not-allowed dark:border-white/10 dark:bg-white/5 dark:text-white"
                  disabled={!canEditCategory}
                  id="category-desc"
                  maxLength={500}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Thêm mô tả về loại sự kiện và kế hoạch trong lịch này..."
                  rows={2}
                  value={description}
                />
              </div>
            </section>


            <section className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2 dark:border-white/10">
                <span className="grid size-5.5 place-items-center rounded-md bg-blue-50 text-xs font-bold text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                  2
                </span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Thời gian & Múi giờ
                </h3>
              </div>


              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300" htmlFor="time-zone">
                  Múi giờ của lịch
                </label>
                <select
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-semibold text-slate-900 outline-hidden transition-all focus:border-blue-600 focus:bg-white disabled:opacity-60 disabled:cursor-not-allowed dark:border-white/10 dark:bg-white/5 dark:text-white"
                  disabled={!canEditCategory}
                  id="time-zone"
                  onChange={(e) => setTimeZone(e.target.value)}
                  value={timeZone}
                >
                  {COMMON_TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                  {!COMMON_TIMEZONES.some((tz) => tz.value === timeZone) && (
                    <option value={timeZone}>{timeZone}</option>
                  )}
                </select>
                <p className="mt-1 text-[11px] text-slate-400">
                  Các sự kiện thuộc lịch này sẽ tự động áp dụng múi giờ đã chọn để tính toán giờ nhắc và lịch học.
                </p>
              </div>


              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300" htmlFor="default-duration">
                  Thời lượng sự kiện mặc định khi tạo mới
                </label>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  {QUICK_DURATIONS.map((mins) => {
                    const isSelected = defaultDurationMinutes === mins
                    return (
                      <button
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all disabled:opacity-60 disabled:cursor-not-allowed ${isSelected
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'border border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300'
                          }`}
                        disabled={!canEditCategory}
                        key={mins}
                        onClick={() => setDefaultDurationMinutes(mins)}
                        type="button"
                      >
                        {mins} phút {mins === 45 ? '(1 tiết)' : mins === 90 ? '(1 ca)' : ''}
                      </button>
                    )
                  })}
                  <div className="flex items-center gap-1.5">
                    <input
                      aria-label="Nhập số phút tùy chỉnh"
                      className="w-18 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-900 outline-hidden focus:border-blue-600 disabled:opacity-60 disabled:cursor-not-allowed dark:border-white/10 dark:bg-white/5 dark:text-white"
                      disabled={!canEditCategory}
                      id="default-duration"
                      max={1440}
                      min={5}
                      onChange={(e) => setDefaultDurationMinutes(Number(e.target.value) || 60)}
                      type="number"
                      value={defaultDurationMinutes}
                    />
                    <span className="text-xs text-slate-500">phút</span>
                  </div>
                </div>
              </div>
            </section>


            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <span className="grid size-5.5 place-items-center rounded-md bg-blue-50 text-xs font-bold text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                    3
                  </span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Thông báo mặc định ({reminderRows.length}/10)
                  </h3>
                </div>
                {canEditCategory && reminderRows.length < 10 && (
                  <button
                    className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline dark:text-blue-400"
                    onClick={handleAddReminder}
                    type="button"
                  >
                    <Icon className="size-3.5" name="plus" />
                    <span>Thêm mốc nhắc</span>
                  </button>
                )}
              </div>

              {reminderRows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 dark:border-white/10">
                  Chưa có mốc nhắc tự động. Nhấn "Thêm mốc nhắc" để thiết lập.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {reminderRows.map((row, idx) => (
                    <div
                      className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 dark:border-white/10 dark:bg-white/5"
                      key={row.id}
                    >
                      <span className="text-xs font-bold text-slate-400 w-5 text-center">{idx + 1}</span>


                      <select
                        aria-label="Kênh thông báo"
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-hidden disabled:opacity-60 disabled:cursor-not-allowed dark:border-white/10 dark:bg-white/10 dark:text-white"
                        disabled={!canEditCategory}
                        onChange={(e) => handleUpdateReminder(row.id, 'method', e.target.value as ReminderMethod)}
                        value={row.method}
                      >
                        <option value="in-app">Thông báo ứng dụng</option>
                        <option value="email">Gửi Email</option>
                      </select>

                      <span className="text-xs text-slate-500">trước</span>


                      <input
                        aria-label="Số lượng thời gian"
                        className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-800 outline-hidden focus:border-blue-600 disabled:opacity-60 disabled:cursor-not-allowed dark:border-white/10 dark:bg-white/10 dark:text-white"
                        disabled={!canEditCategory}
                        max={999}
                        min={1}
                        onChange={(e) => handleUpdateReminder(row.id, 'quantity', Number(e.target.value) || 1)}
                        type="number"
                        value={row.quantity}
                      />


                      <select
                        aria-label="Đơn vị thời gian"
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-hidden disabled:opacity-60 disabled:cursor-not-allowed dark:border-white/10 dark:bg-white/10 dark:text-white"
                        disabled={!canEditCategory}
                        onChange={(e) => handleUpdateReminder(row.id, 'unit', e.target.value as ReminderUnit)}
                        value={row.unit}
                      >
                        <option value="minutes">phút</option>
                        <option value="hours">giờ</option>
                        <option value="days">ngày</option>
                        <option value="weeks">tuần</option>
                      </select>

                      {canEditCategory && (
                        <button
                          aria-label="Xóa mốc nhắc"
                          className="ml-auto grid size-7 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                          onClick={() => handleRemoveReminder(row.id)}
                          type="button"
                        >
                          <Icon className="size-4" name="close" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>


            <section className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2 dark:border-white/10">
                <span className="grid size-5.5 place-items-center rounded-md bg-blue-50 text-xs font-bold text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                  4
                </span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Quyền riêng tư, Mời khách & Quản lý
                </h3>
              </div>


              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300" htmlFor="category-privacy">
                  Chế độ hiển thị lịch
                </label>
                <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all disabled:opacity-60 disabled:cursor-not-allowed ${privacy === 'private'
                      ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-600/30 dark:bg-blue-950/30'
                      : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-white/5'
                      }`}
                    disabled={!canEditCategory}
                    onClick={() => setPrivacy('private')}
                    type="button"
                  >
                    <Icon className="size-4 text-slate-500 mt-0.5 shrink-0" name="lock" />
                    <div>
                      <span className="block text-xs font-bold text-slate-900 dark:text-white">
                        Riêng tư (Chỉ mình tôi & khách mời)
                      </span>
                      <span className="mt-0.5 block text-[11px] text-slate-500 dark:text-slate-400">
                        Chỉ bạn và các thành viên được mời trực tiếp mới có quyền truy cập lịch này.
                      </span>
                    </div>
                  </button>

                  <button
                    className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all disabled:opacity-60 disabled:cursor-not-allowed ${privacy === 'public'
                      ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-600/30 dark:bg-blue-950/30'
                      : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-white/5'
                      }`}
                    disabled={!canEditCategory}
                    onClick={() => setPrivacy('public')}
                    type="button"
                  >
                    <Icon className="size-4 text-blue-600 mt-0.5 shrink-0" name="globe" />
                    <div>
                      <span className="block text-xs font-bold text-slate-900 dark:text-white">
                        Công khai (Mọi người có thể xem)
                      </span>
                      <span className="mt-0.5 block text-[11px] text-slate-500 dark:text-slate-400">
                        Bất kỳ ai có liên kết công khai đều có thể xem lịch (chỉ đọc).
                      </span>
                    </div>
                  </button>
                </div>

                {privacy === 'public' && canEditCategory && (
                  <div className="mt-2.5 rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/40 dark:bg-blue-950/20 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-white">
                        Liên kết lịch công khai
                      </span>
                      {isEditing && publicToken && (
                        <button
                          className="text-[11px] font-semibold text-blue-600 hover:underline dark:text-blue-400"
                          disabled={isRegeneratingPublicToken}
                          onClick={() => void handleRegeneratePublicToken()}
                          type="button"
                        >
                          {isRegeneratingPublicToken ? 'Đang tạo...' : 'Đổi link mới'}
                        </button>
                      )}
                    </div>

                    {isEditing && publicToken ? (
                      <div className="flex items-center gap-2">
                        <input
                          aria-label="Liên kết lịch công khai"
                          className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-hidden dark:border-white/10 dark:bg-white/10 dark:text-slate-200"
                          readOnly
                          type="text"
                          value={`${window.location.origin}/calendar/public/${publicToken}`}
                        />
                        <button
                          className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
                          onClick={() => void handleCopyPublicLink()}
                          type="button"
                        >
                          {publicLinkCopied ? '✓ Đã chép' : 'Sao chép'}
                        </button>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-600 dark:text-slate-300">
                        Nhấn <strong>{isEditing ? 'Lưu thay đổi' : 'Tạo lịch'}</strong> để hệ thống tạo liên kết công khai cho lịch này.
                      </p>
                    )}
                  </div>
                )}
              </div>


              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 dark:border-white/10 dark:bg-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white">
                      Mời khách / Chia sẻ lịch với người khác
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Cấp quyền cho bạn bè, giảng viên hoặc thành viên nhóm áp dụng cho toàn bộ lịch này
                    </p>
                  </div>
                </div>

                {!canEditCategory && (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                    Bạn đang xem lịch được chia sẻ với quyền {myRole === 'editor' ? 'Chỉnh sửa sự kiện' : 'Chỉ xem'}. Chỉ chủ sở hữu hoặc Quản lý mới có thể thay đổi cấu hình lịch.
                  </p>
                )}


                <div className="flex flex-wrap items-center gap-2">
                  <input
                    aria-describedby={guestEmailError ? 'category-guest-error' : undefined}
                    aria-invalid={Boolean(guestEmailError)}
                    aria-label="Email hoặc username khách mời"
                    className={`flex-1 min-w-[200px] rounded-lg border bg-white px-3 py-1.5 text-xs text-slate-900 outline-hidden transition-all disabled:opacity-60 disabled:cursor-not-allowed dark:bg-white/10 dark:text-white ${guestEmailError
                      ? 'border-rose-500 focus:border-rose-500'
                      : 'border-slate-200 focus:border-blue-600 dark:border-white/10'
                      }`}
                    disabled={!canEditCategory || isResolvingGuest}
                    onChange={(e) => {
                      setNewGuestEmail(e.target.value)
                      if (guestEmailError) setGuestEmailError(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        void handleAddGuest()
                      }
                    }}
                    placeholder="Nhập email hoặc username (ví dụ: colleague@hcmute.edu.vn)..."
                    type="text"
                    value={newGuestEmail}
                  />

                  <select
                    aria-label="Quyền của khách"
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-hidden disabled:opacity-60 disabled:cursor-not-allowed dark:border-white/10 dark:bg-white/10 dark:text-white"
                    disabled={!canEditCategory || isResolvingGuest}
                    onChange={(e) => setNewGuestRole(e.target.value as 'viewer' | 'editor' | 'admin')}
                    value={newGuestRole}
                  >
                    <option value="viewer">Chỉ xem</option>
                    <option value="editor">Chỉnh sửa sự kiện</option>
                    <option value="admin">Quản lý toàn diện</option>
                  </select>

                  <button
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled={!canEditCategory || isResolvingGuest}
                    onClick={() => void handleAddGuest()}
                    type="button"
                  >
                    {isResolvingGuest ? 'Đang kiểm tra...' : '+ Thêm khách'}
                  </button>
                </div>
                {guestEmailError && (
                  <p className="text-xs font-semibold text-rose-500" id="category-guest-error">
                    {guestEmailError}
                  </p>
                )}


                {sharedWith.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-200/60 dark:border-white/5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Khách đã được mời ({sharedWith.length})
                    </span>
                    <div className="space-y-1.5">
                      {sharedWith.map((guest) => (
                        <div
                          className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-white/10 dark:bg-white/5"
                          key={guest.email}
                        >
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate mr-2">
                            {guest.email}
                          </span>

                          <div className="flex items-center gap-2 shrink-0">
                            <select
                              aria-label={`Đổi quyền cho ${guest.email}`}
                              className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700 outline-hidden disabled:opacity-60 disabled:cursor-not-allowed dark:border-white/10 dark:bg-white/10 dark:text-slate-200"
                              disabled={!canEditCategory}
                              onChange={(e) =>
                                handleUpdateGuestRole(guest.email, e.target.value as 'viewer' | 'editor' | 'admin')
                              }
                              value={guest.role}
                            >
                              <option value="viewer">Chỉ xem</option>
                              <option value="editor">Chỉnh sửa</option>
                              <option value="admin">Quản lý</option>
                            </select>

                            {canEditCategory && (
                              <button
                                aria-label={`Xóa khách ${guest.email}`}
                                className="grid size-6 place-items-center rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                                onClick={() => setMemberToRemove(guest.email)}
                                type="button"
                              >
                                <Icon className="size-3.5" name="close" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>


              {isEditing && initialCategory?.isShared && (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-rose-200/70 bg-rose-50/40 p-3.5 dark:border-rose-900/30 dark:bg-rose-950/20">
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-white">
                      {initialCategory.isSubscribed ? 'Bỏ theo dõi lịch công khai' : 'Rời khỏi lịch được chia sẻ'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Bạn sẽ không còn thấy lịch này và các sự kiện thuộc lịch này trên màn hình của mình.
                    </p>
                  </div>
                  <button
                    className="shrink-0 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:border-rose-900/40 dark:bg-white/5 dark:text-rose-400 dark:hover:bg-rose-950/30"
                    disabled={isSubmitting}
                    onClick={() => setShowLeaveConfirm(true)}
                    type="button"
                  >
                    {initialCategory.isSubscribed ? 'Bỏ theo dõi' : 'Rời lịch'}
                  </button>
                </div>
              )}

              {isEditing && canEditCategory && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/40 p-3.5 dark:border-white/10 dark:bg-white/2">
                  <div className="flex items-center gap-2">
                    <button
                      className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-all ${archived
                        ? 'border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300'
                        }`}
                      onClick={() => setArchived(!archived)}
                      type="button"
                    >
                      {archived ? 'Đã lưu trữ (Bấm để mở lại)' : 'Lưu trữ lịch này'}
                    </button>
                  </div>

                  {canDeleteCategory && (
                    <button
                      className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:border-rose-900/40 dark:bg-white/5 dark:hover:bg-rose-950/30"
                      onClick={handleDeleteCalendar}
                      type="button"
                    >
                      Xóa vĩnh viễn lịch
                    </button>
                  )}
                </div>
              )}
            </section>
          </div>


          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/50 px-6 py-3.5 dark:border-white/10 dark:bg-white/5">
            <button
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15"
              onClick={onClose}
              type="button"
            >
              {canEditCategory ? 'Hủy' : 'Đóng'}
            </button>
            {canEditCategory && (
              <button
                className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-blue-700 disabled:opacity-50"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? 'Đang lưu...' : isEditing ? 'Lưu thay đổi' : 'Tạo lịch'}
              </button>
            )}
          </div>
        </form>

        {showDeleteConfirm && initialCategory && (
          <div
            aria-modal="true"
            className="fixed inset-0 z-80 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-2xs"
            role="dialog"
          >
            <div
              className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl dark:border-white/10 dark:bg-[#021024] space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                  <Icon className="size-5" name="trash" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Xác nhận xóa lịch &quot;{initialCategory.name}&quot;?
                  </h4>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Hành động này sẽ xóa vĩnh viễn lịch này. Các sự kiện thuộc lịch này sẽ không bị xóa mà được tách thành sự kiện độc lập.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-white/10">
                <button
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 transition-colors"
                  disabled={isSubmitting}
                  onClick={() => setShowDeleteConfirm(false)}
                  type="button"
                >
                  Hủy
                </button>
                <button
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition-colors disabled:opacity-50"
                  disabled={isSubmitting}
                  onClick={handleConfirmDeleteCalendar}
                  type="button"
                >
                  {isSubmitting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
                </button>
              </div>
            </div>
          </div>
        )}

        {memberToRemove && (
          <div
            aria-modal="true"
            className="fixed inset-0 z-80 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-2xs"
            role="dialog"
          >
            <div
              className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl dark:border-white/10 dark:bg-[#021024] space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                  <Icon className="size-5" name="trash" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Xác nhận xóa thành viên khỏi lịch?
                  </h4>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Thành viên <span className="font-semibold text-slate-700 dark:text-slate-200">{memberToRemove}</span> sẽ bị gỡ khỏi danh sách chia sẻ sau khi bạn lưu thay đổi.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-white/10">
                <button
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 transition-colors"
                  onClick={() => setMemberToRemove(null)}
                  type="button"
                >
                  Hủy
                </button>
                <button
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition-colors"
                  onClick={handleConfirmRemoveMember}
                  type="button"
                >
                  Xóa thành viên
                </button>
              </div>
            </div>
          </div>
        )}

        {showLeaveConfirm && initialCategory && (
          <div
            aria-modal="true"
            className="fixed inset-0 z-80 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-2xs"
            role="dialog"
          >
            <div
              className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl dark:border-white/10 dark:bg-[#021024] space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                  <Icon className="size-5" name="close" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Xác nhận rời khỏi lịch &quot;{initialCategory.name}&quot;?
                  </h4>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Bạn sẽ không còn truy cập được lịch này và các sự kiện thuộc lịch này (trừ sự kiện bạn được mời riêng).
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-white/10">
                <button
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 transition-colors"
                  disabled={isSubmitting}
                  onClick={() => setShowLeaveConfirm(false)}
                  type="button"
                >
                  Hủy
                </button>
                <button
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition-colors disabled:opacity-50"
                  disabled={isSubmitting}
                  onClick={() => void handleConfirmLeaveCategory()}
                  type="button"
                >
                  {isSubmitting ? 'Đang xử lý...' : 'Rời lịch'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

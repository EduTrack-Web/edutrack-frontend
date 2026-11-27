import { useState } from 'react'
import { Icon } from '../../../../shared/components/Icon'
import type { EntryType } from '../../models/calendar.types'

export type RecurrenceScopeMode = 'this' | 'following' | 'all'

export type RecurrenceScopeAction = 'update' | 'delete' | 'complete' | 'reopen'

interface RecurrenceScopeOption {
  value: RecurrenceScopeMode
  label: string
  description: string
}

function getRecurrenceScopeOptions(
  action: RecurrenceScopeAction,
  targetDate: Date,
  isFirstOccurrence = false,
): RecurrenceScopeOption[] {
  const formattedDate = targetDate.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  let options: RecurrenceScopeOption[]

  if (action === 'delete') {
    options = [
      {
        value: 'this',
        label: 'Chỉ lần này',
        description: `Chỉ xóa lần diễn ra vào ngày ${formattedDate}.`,
      },
      {
        value: 'following',
        label: 'Lần này và các lần tiếp theo',
        description: `Xóa từ ngày ${formattedDate} trở đi trong chuỗi lặp.`,
      },
      {
        value: 'all',
        label: 'Tất cả các lần trong chuỗi',
        description: 'Xóa cho toàn bộ các lần xuất hiện trong chuỗi lặp.',
      },
    ]
  } else if (action === 'complete') {
    options = [
      {
        value: 'this',
        label: 'Chỉ lần này',
        description: `Chỉ đánh dấu hoàn thành lần diễn ra vào ngày ${formattedDate}.`,
      },
      {
        value: 'following',
        label: 'Lần này và các lần tiếp theo',
        description: `Đánh dấu hoàn thành từ ngày ${formattedDate} trở đi trong chuỗi lặp.`,
      },
      {
        value: 'all',
        label: 'Tất cả các lần trong chuỗi',
        description: 'Đánh dấu hoàn thành cho toàn bộ các lần xuất hiện trong chuỗi lặp.',
      },
    ]
  } else if (action === 'reopen') {
    options = [
      {
        value: 'this',
        label: 'Chỉ lần này',
        description: `Chỉ mở lại lần diễn ra vào ngày ${formattedDate}.`,
      },
      {
        value: 'following',
        label: 'Lần này và các lần tiếp theo',
        description: `Mở lại từ ngày ${formattedDate} trở đi trong chuỗi lặp.`,
      },
      {
        value: 'all',
        label: 'Tất cả các lần trong chuỗi',
        description: 'Mở lại cho toàn bộ các lần xuất hiện trong chuỗi lặp.',
      },
    ]
  } else {
    options = [
      {
        value: 'this',
        label: 'Chỉ lần này',
        description: `Chỉ cập nhật cho lần diễn ra vào ngày ${formattedDate}.`,
      },
      {
        value: 'following',
        label: 'Lần này và các lần tiếp theo',
        description: `Cập nhật từ ngày ${formattedDate} trở đi trong chuỗi lặp.`,
      },
      {
        value: 'all',
        label: 'Tất cả các lần trong chuỗi',
        description: 'Cập nhật cho toàn bộ các lần xuất hiện trong chuỗi lặp.',
      },
    ]
  }

  return isFirstOccurrence ? options.filter((opt) => opt.value !== 'following') : options
}

interface RecurrenceScopeModalProps {
  isOpen: boolean
  action: RecurrenceScopeAction
  entryType: EntryType
  title: string
  targetDate: Date
  isFirstOccurrence?: boolean
  initialMode?: RecurrenceScopeMode
  isSubmitting?: boolean
  onCancel: () => void
  onConfirm: (mode: RecurrenceScopeMode) => void
}

function RecurrenceScopeModalContent({
  action,
  entryType,
  title,
  targetDate,
  isFirstOccurrence = false,
  initialMode = 'this',
  isSubmitting = false,
  onCancel,
  onConfirm,
}: Omit<RecurrenceScopeModalProps, 'isOpen'>) {
  const safeInitialMode = isFirstOccurrence && initialMode === 'following' ? 'this' : initialMode
  const [selectedMode, setSelectedMode] = useState<RecurrenceScopeMode>(safeInitialMode)

  const isDelete = action === 'delete'
  const options = getRecurrenceScopeOptions(action, targetDate, isFirstOccurrence)
  const itemLabel = entryType === 'task' ? 'nhiệm vụ' : 'sự kiện'
  const headingText =
    action === 'delete'
      ? `Xóa ${itemLabel} lặp lại`
      : action === 'complete'
        ? `Đánh dấu hoàn thành ${itemLabel} lặp lại`
        : action === 'reopen'
          ? `Mở lại ${itemLabel} lặp lại`
          : `Cập nhật ${itemLabel} lặp lại`
  const confirmButtonText =
    action === 'delete' ? 'Xóa' : action === 'complete' || action === 'reopen' ? 'Xác nhận' : 'Lưu thay đổi'

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-70 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-2xs"
      onClick={() => {
        if (!isSubmitting) onCancel()
      }}
      role="dialog"
    >
      <div
        className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6 dark:border-white/10 dark:bg-[#021024]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div
            className={`grid size-10 shrink-0 place-items-center rounded-xl ${
              isDelete
                ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                : 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
            }`}
          >
            <Icon className="size-5" name={isDelete ? 'trash' : 'calendar'} />
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              {headingText}
            </h4>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Mục “{title || itemLabel}” là một chuỗi lặp lại.{' '}
              {isDelete ? 'Vui lòng chọn phạm vi xóa:' : 'Vui lòng chọn phạm vi áp dụng:'}
            </p>
          </div>
        </div>

        <div className="space-y-2 pt-1">
          {options.map((opt) => {
            const isSelected = selectedMode === opt.value
            const activeClass = isDelete
              ? 'border-rose-600 bg-rose-50/50 dark:border-rose-500 dark:bg-rose-950/30'
              : 'border-blue-600 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-950/30'
            const radioClass = isDelete
              ? 'text-rose-600 focus:ring-rose-500'
              : 'text-blue-600 focus:ring-blue-500'

            return (
              <label
                key={opt.value}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                  isSelected
                    ? activeClass
                    : 'border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5'
                }`}
              >
                <input
                  type="radio"
                  name="recurrence_scope_mode"
                  value={opt.value}
                  checked={isSelected}
                  disabled={isSubmitting}
                  onChange={() => setSelectedMode(opt.value)}
                  className={`mt-0.5 size-4 ${radioClass}`}
                />
                <div className="flex-1 min-w-0">
                  <span className="block text-xs font-bold text-slate-800 dark:text-white">
                    {opt.label}
                  </span>
                  <span className="block mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    {opt.description}
                  </span>
                </div>
              </label>
            )
          })}
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-3 dark:border-white/10">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onCancel}
            className="min-h-10 rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => onConfirm(selectedMode)}
            className={`min-h-10 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors disabled:opacity-50 ${
              isDelete
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isSubmitting ? 'Đang xử lý...' : confirmButtonText}
          </button>
        </div>
      </div>
    </div>
  )
}

export function RecurrenceScopeModal({ isOpen, ...rest }: RecurrenceScopeModalProps) {
  if (!isOpen) return null
  return <RecurrenceScopeModalContent {...rest} />
}

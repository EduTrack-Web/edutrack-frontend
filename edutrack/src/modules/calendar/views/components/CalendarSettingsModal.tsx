import type { CalendarPreferences } from '../../models/calendar.types'
import { Icon } from '@/shared/components/Icon'

interface CalendarSettingsModalProps {
  isOpen: boolean
  preferences: CalendarPreferences
  isSaving: boolean
  onClose: () => void
  onUpdatePreferences: (preferences: Partial<CalendarPreferences>) => Promise<boolean>
}

interface SwitchRowProps {
  id: string
  label: string
  description: string
  checked: boolean
  disabled: boolean
  onToggle: () => void
  compact?: boolean
}

function SwitchRow({
  id,
  label,
  description,
  checked,
  disabled,
  onToggle,
  compact = false,
}: SwitchRowProps) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-white/10 ${
        compact ? 'bg-white p-3 dark:bg-white/3' : 'bg-slate-50/50 p-3.5 dark:bg-white/5'
      }`}
    >
      <div className="min-w-0">
        <p className={`${compact ? 'text-xs' : 'text-sm'} font-bold text-slate-800 dark:text-white`} id={id}>
          {label}
        </p>
        <p className={`mt-0.5 ${compact ? 'text-[11px]' : 'text-xs'} text-slate-500 dark:text-slate-400`}>
          {description}
        </p>
      </div>
      <button
        aria-checked={checked}
        aria-labelledby={id}
        className="inline-flex min-h-11 shrink-0 items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-wait disabled:opacity-60"
        disabled={disabled}
        onClick={onToggle}
        role="switch"
        type="button"
      >
        <span
          className={`relative block h-7 w-12 rounded-full transition-colors ${
            checked ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
          }`}
        >
          <span
            className={`absolute top-1 left-1 size-5 rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none ${
              checked ? 'translate-x-5' : ''
            }`}
          />
        </span>
      </button>
    </div>
  )
}

export function CalendarSettingsModal({
  isOpen,
  preferences,
  isSaving,
  onClose,
  onUpdatePreferences,
}: CalendarSettingsModalProps) {
  if (!isOpen) return null

  return (
    <div
      aria-labelledby="calendar-general-settings-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
      onMouseDown={() => { if (!isSaving) onClose() }}
      role="dialog"
    >
      <div
        className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#021024]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white" id="calendar-general-settings-title">
              Cài đặt lịch
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Tùy chỉnh hiển thị chung cho toàn bộ trang lịch. Thay đổi được lưu ngay lập tức.
            </p>
          </div>
          <button
            aria-label="Đóng cài đặt lịch"
            className="grid min-h-11 min-w-11 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:hover:bg-white/10"
            disabled={isSaving}
            onClick={onClose}
            type="button"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <SwitchRow
            checked={preferences.showLunarCalendar}
            description="Hiển thị ngày Âm Việt Nam bên cạnh ngày Dương."
            disabled={isSaving}
            id="lunar-calendar-switch-label"
            label="Hiển thị lịch Âm"
            onToggle={() => void onUpdatePreferences({ showLunarCalendar: !preferences.showLunarCalendar })}
          />
        </div>

        <div className="mt-5 flex justify-end">
          <button
            className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
            disabled={isSaving}
            onClick={onClose}
            type="button"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}

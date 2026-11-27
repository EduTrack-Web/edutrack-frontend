import { useRef, useState } from 'react'
import { Icon } from '../../../../shared/components/Icon'
import type { CalendarCategory } from '../../models/calendar.types'
import { calendarApi } from '../../services/calendarApi'

interface CalendarIcsModalProps {
  isOpen: boolean
  category: CalendarCategory | null
  onClose: () => void
  onImported: () => void
}

function countVevents(icsContent: string): number {
  const matches = icsContent.match(/BEGIN:VEVENT/gi)
  return matches ? matches.length : 0
}

export function CalendarIcsModal({
  isOpen,
  category,
  onClose,
  onImported,
}: CalendarIcsModalProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [pendingFile, setPendingFile] = useState<{
    name: string
    content: string
    eventCount: number
  } | null>(null)
  const [statusMessage, setStatusMessage] = useState<{
    text: string
    type: 'success' | 'error'
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen || !category) return null

  const myRole = category.myRole ?? (category.isShared ? 'viewer' : 'owner')
  const canImportIcs = myRole === 'owner' || myRole === 'admin' || myRole === 'editor'

  const handleExport = async () => {
    try {
      setIsExporting(true)
      setStatusMessage(null)
      await calendarApi.exportCategoryIcs(category.id)
      setStatusMessage({ text: 'Đã xuất file .ics thành công!', type: 'success' })
    } catch {
      setStatusMessage({ text: 'Lỗi khi xuất file .ics. Vui lòng thử lại.', type: 'error' })
    } finally {
      setIsExporting(false)
    }
  }

  const handleSelectFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setStatusMessage(null)
      const text = await file.text()
      const eventCount = countVevents(text)
      if (eventCount === 0) {
        setPendingFile(null)
        setStatusMessage({
          text: 'Không tìm thấy sự kiện (VEVENT) hợp lệ trong file .ics đã chọn.',
          type: 'error',
        })
        return
      }
      setPendingFile({
        name: file.name,
        content: text,
        eventCount,
      })
    } catch {
      setPendingFile(null)
      setStatusMessage({ text: 'Không thể đọc file .ics. Vui lòng thử lại.', type: 'error' })
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleConfirmImport = async () => {
    if (!pendingFile) return
    try {
      setIsImporting(true)
      setStatusMessage(null)
      const res = await calendarApi.importCategoryIcs(category.id, pendingFile.content)
      const count = res.data?.importedCount ?? 0
      setPendingFile(null)
      setStatusMessage({
        text: `Đã nhập thành công ${count} sự kiện vào lịch "${category.name}"!`,
        type: 'success',
      })
      onImported()
    } catch {
      setStatusMessage({
        text: 'Lỗi khi nhập file .ics. Vui lòng kiểm tra định dạng file.',
        type: 'error',
      })
    } finally {
      setIsImporting(false)
    }
  }

  const handleCancel = () => {
    setPendingFile(null)
    setStatusMessage(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4">
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={handleCancel}
      />

      <div
        aria-modal="true"
        className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200/80 bg-white shadow-2xl dark:border-white/10 dark:bg-[#021024]"
        role="dialog"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="grid size-9 shrink-0 place-items-center rounded-xl text-white shadow-xs"
              style={{ backgroundColor: category.color }}
            >
              <Icon className="size-4.5" name="calendar" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-slate-900 dark:text-white">
                Nhập / Xuất dữ liệu (.ics): {category.name}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Tương thích với Google Calendar, Outlook, Apple Calendar
              </p>
            </div>
          </div>

          <button
            aria-label="Đóng"
            className="grid size-8 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
            onClick={handleCancel}
            type="button"
          >
            <Icon className="size-4" name="close" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-white/10 dark:bg-white/5 space-y-2">
            <h3 className="text-xs font-bold text-slate-800 dark:text-white">
              Xuất file iCalendar (.ics)
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Tải xuống toàn bộ sự kiện thuộc lịch này để sao lưu hoặc mở trên ứng dụng lịch khác.
            </p>
            <button
              className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/10 dark:text-white"
              disabled={isExporting}
              onClick={() => void handleExport()}
              type="button"
            >
              {isExporting ? 'Đang xuất file...' : 'Xuất file .ics'}
            </button>
          </div>

          {canImportIcs ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-white/10 dark:bg-white/5 space-y-3">
              <div>
                <h3 className="text-xs font-bold text-slate-800 dark:text-white">
                  Nhập sự kiện từ file .ics
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Chọn file `.ics`, xem trước số sự kiện và xác nhận trước khi thêm vào lịch.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:text-white">
                  <span>{pendingFile ? 'Chọn file khác' : 'Chọn file .ics'}</span>
                  <input
                    accept=".ics,text/calendar"
                    className="sr-only"
                    disabled={isImporting}
                    onChange={(e) => void handleSelectFile(e)}
                    ref={fileInputRef}
                    type="file"
                  />
                </label>

                {pendingFile && (
                  <button
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                    disabled={isImporting}
                    onClick={() => {
                      setPendingFile(null)
                      setStatusMessage(null)
                    }}
                    type="button"
                  >
                    Bỏ chọn file
                  </button>
                )}
              </div>

              {pendingFile && (
                <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 text-xs dark:border-blue-900/40 dark:bg-blue-950/30 space-y-1">
                  <p className="font-bold text-slate-800 dark:text-white">
                    File đã chọn: {pendingFile.name}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300">
                    Phát hiện <span className="font-bold text-blue-600 dark:text-blue-400">{pendingFile.eventCount}</span> sự kiện sẵn sàng nhập vào lịch &quot;{category.name}&quot;.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
              Bạn đang có quyền <strong>Chỉ xem</strong> trên lịch này nên chỉ có thể xuất file `.ics`.
            </div>
          )}

          {statusMessage && (
            <p
              className={`text-xs font-semibold ${
                statusMessage.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {statusMessage.text}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/50 px-5 py-3.5 dark:border-white/10 dark:bg-white/5 rounded-b-2xl">
          <button
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15"
            disabled={isImporting}
            onClick={handleCancel}
            type="button"
          >
            {pendingFile ? 'Hủy' : 'Đóng'}
          </button>

          {canImportIcs && pendingFile && (
            <button
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-blue-700 disabled:opacity-50"
              disabled={isImporting}
              onClick={() => void handleConfirmImport()}
              type="button"
            >
              {isImporting ? 'Đang nhập...' : 'Xác nhận nhập vào lịch'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

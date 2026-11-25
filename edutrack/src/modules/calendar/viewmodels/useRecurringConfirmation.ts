import { useEffect, useRef, useState } from 'react'
import type { EntryType } from '../models/calendar.types'

const actions = {
  save: ['Lưu cả chuỗi', 'Các thay đổi sẽ áp dụng cho tất cả các lần trong chuỗi.'],
  stop: ['Bỏ lặp lại', 'Chỉ mục gốc được giữ lại. Các lần do quy tắc lặp tạo ra sẽ biến mất khỏi lịch.'],
  complete: ['Đánh dấu hoàn thành', 'Tất cả các lần của nhiệm vụ này sẽ được đánh dấu hoàn thành.'],
  reopen: ['Đánh dấu chưa hoàn thành', 'Tất cả các lần của nhiệm vụ này sẽ chuyển về chưa hoàn thành.'],
  accepted: ['Tham gia cả chuỗi', 'Bạn sẽ đồng ý tham gia tất cả các lần trong chuỗi.'],
  declined: ['Từ chối cả chuỗi', 'Bạn sẽ từ chối tham gia tất cả các lần trong chuỗi.'],
} as const

export interface RecurringConfirmation {
  title: string
  message: string
  label: string
  respond: (confirmed: boolean) => void
}

export function useRecurringConfirmation() {
  const [confirmation, setConfirmation] = useState<RecurringConfirmation | null>(null)
  const pending = useRef<((confirmed: boolean) => void) | null>(null)

  useEffect(() => () => {
    pending.current?.(false)
    pending.current = null
  }, [])

  function confirmRecurring(action: keyof typeof actions, entryType: EntryType, title: string) {
    if (pending.current) return Promise.resolve(false)
    const [label, message] = actions[action]
    return new Promise<boolean>((resolve) => {
      pending.current = resolve
      setConfirmation({
        title: `${entryType === 'task' ? 'Nhiệm vụ' : 'Sự kiện'} lặp lại “${title}”`,
        label,
        message,
        respond: (confirmed) => {
          if (pending.current !== resolve) return
          pending.current = null
          setConfirmation(null)
          resolve(confirmed)
        },
      })
    })
  }

  return { confirmation, confirmRecurring }
}

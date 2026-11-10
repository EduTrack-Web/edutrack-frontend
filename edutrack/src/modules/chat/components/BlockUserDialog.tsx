import type { ChatUserSummary } from '@/modules/chat/models/chat.types'

interface BlockUserDialogProps {
  user: ChatUserSummary
  isSaving: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function BlockUserDialog({ user, isSaving, onCancel, onConfirm }: BlockUserDialogProps) {
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-palette-950/45 p-4 backdrop-blur-sm" onMouseDown={onCancel} role="presentation">
      <section aria-labelledby="block-user-title" aria-modal="true" className="content-card w-full max-w-md p-5 sm:p-6" onMouseDown={(event) => event.stopPropagation()} role="dialog">
        <h2 className="text-xl font-black text-palette-900 dark:text-white" id="block-user-title">Chặn {user.fullName}?</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Quan hệ bạn bè và lời mời hiện có sẽ bị hủy. Hai người không thể kết bạn hoặc trò chuyện riêng cho đến khi bạn bỏ chặn.
        </p>
        <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">Tin nhắn trong nhóm chung vẫn được hiển thị để giữ ngữ cảnh.</p>
        <div className="mt-6 flex justify-end gap-3">
          <button className="min-h-11 rounded-xl border border-palette-200/80 bg-white/80 px-4 text-sm font-bold text-palette-900 disabled:opacity-50 dark:border-white/15 dark:bg-white/10 dark:text-white" disabled={isSaving} onClick={onCancel} type="button">Hủy</button>
          <button className="min-h-11 rounded-xl bg-red-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50" disabled={isSaving} onClick={onConfirm} type="button">{isSaving ? 'Đang chặn…' : 'Chặn người dùng'}</button>
        </div>
      </section>
    </div>
  )
}

import { ChatActionIcon } from '@/modules/chat/components/ChatActionIcon'
import { ChatUserCard } from '@/modules/chat/components/ChatUserCard'
import { useChatLayout } from '@/modules/chat/viewmodels/useChatLayout'
import { ChatEmptyState, ChatSectionHeader } from '@/modules/chat/views/ChatPage'

const secondaryButtonClass = 'inline-flex min-h-11 items-center justify-center rounded-xl border border-palette-200/80 bg-white/75 px-3 text-xs font-bold text-palette-900 transition hover:bg-palette-100 disabled:opacity-50 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15'

export function ChatSettingsPage() {
  const { vm } = useChatLayout()

  return (
    <main className="flex h-full min-h-0 flex-col bg-white/22 dark:bg-palette-950/10">
      <ChatSectionHeader description="Quản lý quyền riêng tư và người dùng đã chặn" icon="settings" title="Cài đặt trò chuyện" />

      <div className="min-h-0 flex-1 overflow-y-auto p-2 sm:p-4">
        <div className="w-full space-y-4">
          <section className="rounded-2xl border border-palette-200/70 bg-white/60 p-3 sm:p-4 dark:border-white/10 dark:bg-white/5" id="activity">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-palette-100 text-palette-700 dark:bg-white/10 dark:text-palette-200"><ChatActionIcon name="activity" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-black text-palette-900 dark:text-white">Trạng thái hoạt động</h2>
                  <span className="rounded-full bg-palette-100 px-2 py-1 text-[11px] font-bold text-palette-700 dark:bg-white/10 dark:text-palette-200">Đang dùng mặc định</span>
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">EduTrack hiện hiển thị trạng thái trực tuyến và lần hoạt động gần nhất. Tùy chọn bật hoặc tắt sẽ được nối vào đây sau khi backend có API lưu thiết lập quyền riêng tư.</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-palette-200/70 bg-white/60 dark:border-white/10 dark:bg-white/5" id="blocked">
            <header className="flex items-center gap-3 border-b border-palette-200/60 p-3 sm:p-4 dark:border-white/8">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-palette-100 text-palette-700 dark:bg-white/10 dark:text-palette-200"><ChatActionIcon name="block" /></span>
              <div className="min-w-0 flex-1">
                <h2 className="font-black text-palette-900 dark:text-white">Danh sách chặn</h2>
                <p className="text-xs text-slate-500 dark:text-slate-300">{vm.blockedUsers.length} tài khoản</p>
              </div>
            </header>
            <div className="p-2 sm:p-3">
              {vm.isLoading ? (
                <div className="space-y-2">{[0, 1].map((item) => <div className="h-[70px] animate-pulse rounded-2xl bg-palette-100 dark:bg-white/5" key={item} />)}</div>
              ) : vm.blockedUsers.length > 0 ? (
                <div className="grid gap-2 xl:grid-cols-2">{vm.blockedUsers.map((user) => <ChatUserCard actions={<button className={secondaryButtonClass} disabled={Boolean(vm.busyId)} onClick={() => void vm.unblock(user)} type="button">Bỏ chặn</button>} key={user.id} user={user} />)}</div>
              ) : (
                <ChatEmptyState icon="block" message="Bạn chưa chặn người dùng nào." />
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

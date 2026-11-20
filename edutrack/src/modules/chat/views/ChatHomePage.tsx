import { ChatActionIcon } from '@/modules/chat/components/ChatActionIcon'

export function ChatHomePage() {
  return (
    <section className="hidden h-full place-items-center bg-white/22 p-6 text-center lg:grid dark:bg-palette-950/10">
      <div className="max-w-sm">
        <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-palette-100 text-palette-700 shadow-sm dark:bg-white/10 dark:text-palette-200"><ChatActionIcon className="size-7" name="message" /></span>
        <h1 className="mt-4 text-xl font-black text-palette-900 dark:text-white">Chọn một khung trò chuyện</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Chọn bạn bè hoặc nhóm ở danh sách bên trái để bắt đầu nhắn tin.</p>
      </div>
    </section>
  )
}

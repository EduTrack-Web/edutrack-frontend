import { GlassSelect } from '@/shared/components/GlassSelect'
import type { ChatGroupHistoryVisibility, FriendSearchResult } from '@/modules/chat/models/chat.types'
import { CHAT_GROUP_DESCRIPTION_MAX_LENGTH, CHAT_GROUP_NAME_MAX_LENGTH } from '@/modules/chat/models/chatGroupValidation'
import { useCreateChatGroupViewModel } from '@/modules/chat/viewmodels/useCreateChatGroupViewModel'
import { ChatActionIcon } from '@/modules/chat/components/ChatActionIcon'

const historyOptions: ReadonlyArray<{ value: ChatGroupHistoryVisibility; label: string }> = [
  { value: 'from_join', label: 'Chỉ từ lúc tham gia' },
  { value: 'all', label: 'Toàn bộ lịch sử' },
]

interface CreateChatGroupDialogProps {
  onClose: () => void
}

export function CreateChatGroupDialog({ onClose }: CreateChatGroupDialogProps) {
  const vm = useCreateChatGroupViewModel(onClose)
  const fieldClass = (field: string) => `min-h-11 w-full rounded-xl border bg-white/75 p-3 text-sm text-palette-900 outline-none dark:bg-palette-900/60 dark:text-white ${vm.fieldErrors[field] ? 'border-red-500' : 'border-palette-200/80 focus:border-palette-700 dark:border-white/15'}`

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-palette-950/50 p-4 backdrop-blur-sm" onMouseDown={() => { if (!vm.isSubmitting) onClose() }} role="presentation">
      <section aria-labelledby="create-chat-group-title" aria-modal="true" className="content-card max-h-[calc(100dvh-32px)] w-full max-w-2xl overflow-y-auto p-4 sm:p-6" onMouseDown={(event) => event.stopPropagation()} role="dialog">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-palette-100 text-palette-700 dark:bg-white/10 dark:text-palette-200"><ChatActionIcon name="group" /></span>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-black text-palette-900 dark:text-white" id="create-chat-group-title">Tạo nhóm trò chuyện</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Chọn ít nhất hai người. Bạn bè vào nhóm ngay; người khác nhận lời mời tham gia.</p>
          </div>
          <button aria-label="Đóng" className="grid size-11 shrink-0 place-items-center rounded-xl text-palette-900 hover:bg-palette-100 dark:text-white dark:hover:bg-white/10" disabled={vm.isSubmitting} onClick={onClose} type="button">×</button>
        </div>

        <form className="mt-5 space-y-4" noValidate onSubmit={(event) => void vm.submit(event)}>
          <div>
            <label className="text-sm font-extrabold text-palette-900 dark:text-white" htmlFor="chat-group-name">Tên nhóm</label>
            <input aria-describedby={vm.fieldErrors.name ? 'chat-group-name-error' : undefined} aria-invalid={Boolean(vm.fieldErrors.name)} className={`${fieldClass('name')} mt-2`} id="chat-group-name" maxLength={CHAT_GROUP_NAME_MAX_LENGTH} onChange={(event) => vm.setName(event.target.value)} value={vm.name} />
            {vm.fieldErrors.name && <p className="mt-1 text-xs font-semibold text-red-600 dark:text-red-300" id="chat-group-name-error">{vm.fieldErrors.name}</p>}
          </div>

          <div>
            <label className="text-sm font-extrabold text-palette-900 dark:text-white" htmlFor="chat-group-description">Mô tả</label>
            <textarea aria-describedby={vm.fieldErrors.description ? 'chat-group-description-error' : undefined} aria-invalid={Boolean(vm.fieldErrors.description)} className={`${fieldClass('description')} mt-2 min-h-24 resize-y`} id="chat-group-description" maxLength={CHAT_GROUP_DESCRIPTION_MAX_LENGTH} onChange={(event) => vm.setDescription(event.target.value)} value={vm.description} />
            <div className="mt-1 flex justify-between gap-2 text-xs"><span className="font-semibold text-red-600 dark:text-red-300" id="chat-group-description-error">{vm.fieldErrors.description}</span><span className="text-slate-500 dark:text-slate-300">{vm.description.length}/{CHAT_GROUP_DESCRIPTION_MAX_LENGTH}</span></div>
          </div>

          <div>
            <p className="text-sm font-extrabold text-palette-900 dark:text-white">Lịch sử dành cho thành viên mới</p>
            <GlassSelect ariaLabel="Lịch sử dành cho thành viên mới" className="mt-2 w-full sm:w-64" onChange={vm.setHistoryVisibility} options={historyOptions} value={vm.historyVisibility} />
          </div>

          <div>
            <label className="text-sm font-extrabold text-palette-900 dark:text-white" htmlFor="chat-group-member-search">Thêm thành viên</label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <div className="min-w-0 flex-1">
                <input aria-describedby={vm.fieldErrors.participantQuery ? 'chat-group-search-error' : undefined} aria-invalid={Boolean(vm.fieldErrors.participantQuery)} className={fieldClass('participantQuery')} id="chat-group-member-search" onChange={(event) => vm.setParticipantQuery(event.target.value)} placeholder="Username hoặc email" value={vm.participantQuery} />
                {vm.fieldErrors.participantQuery && <p className="mt-1 text-xs font-semibold text-red-600 dark:text-red-300" id="chat-group-search-error">{vm.fieldErrors.participantQuery}</p>}
              </div>
              <button className="secondary-button min-h-11 !rounded-xl !px-4 !py-2" disabled={vm.isSearching} onClick={() => void vm.searchUsers()} type="button"><ChatActionIcon className="size-4" name="search" />{vm.isSearching ? 'Đang tìm…' : 'Tìm'}</button>
            </div>

            {vm.searchResults.length > 0 && <div className="mt-2 grid gap-2 sm:grid-cols-2">{vm.searchResults.map((user) => <SearchUserOption key={user.id} onSelect={() => vm.selectUser(user)} user={user} />)}</div>}
            {vm.selectedUsers.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{vm.selectedUsers.map((user) => (
              <span className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-full bg-palette-100 pl-3 text-sm font-bold text-palette-900 dark:bg-white/10 dark:text-white" key={user.id}>
                <span className="max-w-44 truncate">{user.fullName} · @{user.username}</span>
                <button aria-label={`Bỏ ${user.fullName}`} className="grid size-11 place-items-center rounded-full hover:bg-black/10" onClick={() => vm.removeUser(user.id)} type="button">×</button>
              </span>
            ))}</div>}
            {vm.fieldErrors.participantIds && <p className="mt-1 text-xs font-semibold text-red-600 dark:text-red-300">{vm.fieldErrors.participantIds}</p>}
          </div>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button className="secondary-button" disabled={vm.isSubmitting} onClick={onClose} type="button">Hủy</button>
            <button className="primary-button" disabled={vm.isSubmitting} type="submit"><ChatActionIcon className="size-4" name="plus" />{vm.isSubmitting ? 'Đang tạo…' : 'Tạo nhóm'}</button>
          </div>
        </form>
      </section>
    </div>
  )
}

function SearchUserOption({ user, onSelect }: { user: FriendSearchResult; onSelect: () => void }) {
  return (
    <button className="flex min-h-11 min-w-0 items-center gap-3 rounded-xl border border-palette-200/70 bg-white/60 p-2 text-left hover:bg-palette-100/70 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10" onClick={onSelect} type="button">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-palette-200 font-black text-palette-900">{user.fullName.charAt(0).toUpperCase()}</span>
      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-extrabold text-palette-900 dark:text-white">{user.fullName}</span><span className="block truncate text-xs text-slate-500 dark:text-slate-300">@{user.username} · {user.relation === 'friend' ? 'Bạn bè' : 'Sẽ nhận lời mời'}</span></span>
      <ChatActionIcon className="size-4 shrink-0" name="plus" />
    </button>
  )
}

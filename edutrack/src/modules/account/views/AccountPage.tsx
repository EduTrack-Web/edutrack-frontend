import { useAuth } from '../../auth/viewmodels/useAuth'

const initials = (name: string): string => name.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]?.toUpperCase()).join('') || 'U'

export function AccountPage() {
  const { user } = useAuth()
  if (!user) return null
  return <div className="mx-auto max-w-4xl"><section className="content-card p-4 sm:p-6"><div className="flex flex-col gap-6 sm:flex-row sm:items-center"><div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-3xl bg-palette-900 text-2xl font-black text-palette-100">{user.avatarUrl ? <img alt={`Avatar của ${user.fullName}`} className="size-full object-cover" src={user.avatarUrl} referrerPolicy="no-referrer" /> : initials(user.fullName)}</div><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-palette-700 dark:text-palette-200">Trang cá nhân</p><h1 className="mt-2 text-3xl font-black tracking-tight text-palette-950 dark:text-white">{user.fullName}</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">@{user.username}</p></div></div><dl className="mt-6 grid gap-4 border-t border-palette-200/70 pt-6 dark:border-white/10 sm:grid-cols-2"><div><dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Email</dt><dd className="mt-2 text-sm font-semibold text-palette-950 dark:text-white">{user.email}</dd></div><div><dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Vai trò</dt><dd className="mt-2 text-sm font-semibold capitalize text-palette-950 dark:text-white">{user.role}</dd></div></dl></section></div>
}

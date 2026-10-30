import { useDashboardViewModel } from '../viewmodels/useDashboardViewModel'

export function DashboardPage() {
  const viewModel = useDashboardViewModel()
  return (
    <div className="mx-auto max-w-6xl">
      <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-palette-900 via-palette-900 to-palette-700 p-4 text-white shadow-2xl shadow-palette-900/15 sm:p-6">
        <div className="absolute -right-14 -top-20 size-64 rounded-full border border-white/15 bg-palette-200/10" />
        <div className="relative max-w-2xl"><span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-palette-100">Quản lý học tập thông minh</span><h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">{viewModel.title}</h1><p className="mt-4 max-w-xl text-sm leading-7 text-palette-100 sm:text-base">{viewModel.description}</p></div>
      </section>
      <section className="mt-8" aria-labelledby="core-modules-title"><p className="text-sm font-bold text-palette-700 dark:text-palette-200">Nền tảng cốt lõi</p><h2 id="core-modules-title" className="mt-1 text-2xl font-extrabold tracking-tight text-palette-950 dark:text-white">Mọi công cụ trong một nơi</h2><div className="mt-5 grid gap-4 md:grid-cols-3">{viewModel.modules.map((module, index) => <article key={module.name} className="content-card p-6"><span className="grid size-10 place-items-center rounded-xl bg-palette-100 text-sm font-black text-palette-700 dark:bg-white/10 dark:text-palette-200">{String(index + 1).padStart(2, '0')}</span><h3 className="mt-5 text-lg font-extrabold text-palette-950 dark:text-white">{module.name}</h3><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{module.description}</p></article>)}</div></section>
    </div>
  )
}

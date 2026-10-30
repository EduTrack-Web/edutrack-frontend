import { Link } from 'react-router-dom'

import { Icon } from '../../../shared/components/Icon'

const features = [
  ['Lịch trình rõ ràng', 'Tập trung sự kiện, deadline và lời nhắc trong một lịch học tập.'],
  ['Ghi chú kết nối', 'Tổ chức kiến thức và liên kết ghi chú với từng sự kiện.'],
  ['Cộng tác liền mạch', 'Trao đổi cùng nhóm học tập trong không gian thời gian thực.'],
] as const

export function LandingPage() {
  return (
    <div className="overflow-hidden px-4 pb-6 sm:px-6">
      <section className="relative mx-auto grid min-h-[calc(100vh-8rem)] max-w-7xl items-center gap-6 py-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative z-10"><span className="glass-badge">Nền tảng quản lý học tập</span><h1 className="mt-6 max-w-3xl text-5xl font-black leading-[1.05] tracking-[-0.055em] text-palette-950 dark:text-white sm:text-6xl lg:text-7xl">Làm chủ kế hoạch.<br /><span className="text-palette-700 dark:text-palette-200">Tiến gần mục tiêu.</span></h1><p className="mt-6 max-w-xl text-base leading-8 text-slate-600 dark:text-slate-300 sm:text-lg">EduTrack đưa lịch trình, ghi chú và cộng tác nhóm vào một không gian tinh gọn để bạn tập trung vào điều quan trọng nhất.</p><div className="mt-8 flex flex-wrap gap-3"><Link className="primary-button" to="/register">Bắt đầu miễn phí<Icon name="arrowRight" /></Link><Link className="secondary-button" to="/login">Tôi đã có tài khoản</Link></div></div>
        <div className="relative mx-auto h-120 w-full max-w-xl"><div className="absolute inset-8 rounded-[44px] bg-palette-200/70 blur-3xl dark:bg-palette-900/60" /><div className="glass-showcase absolute inset-0 rotate-2 rounded-[38px] p-4 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-palette-700 dark:text-palette-200">Hôm nay</p><p className="mt-1 text-xl font-black text-palette-950 dark:text-white">Không gian của bạn</p></div><span className="grid size-12 place-items-center rounded-2xl bg-palette-900 text-sm font-black text-white">ET</span></div><div className="mt-8 grid grid-cols-2 gap-4"><div className="content-card col-span-2 p-4 sm:p-6"><p className="text-sm font-bold text-palette-950 dark:text-white">Tiến độ hôm nay</p><div className="mt-4 h-2 overflow-hidden rounded-full bg-palette-100 dark:bg-white/10"><div className="h-full w-2/3 rounded-full bg-palette-700" /></div><p className="mt-3 text-xs text-slate-500 dark:text-slate-400">4 trong 6 công việc đã hoàn thành</p></div>{features.slice(0, 2).map(([title], index) => <div className="content-card p-4 sm:p-6" key={title}><span className="grid size-10 place-items-center rounded-2xl bg-palette-100 font-black text-palette-700 dark:bg-white/10 dark:text-palette-200">0{index + 1}</span><p className="mt-6 text-sm font-extrabold text-palette-950 dark:text-white">{title}</p></div>)}</div></div></div>
      </section>
      <section className="mx-auto max-w-7xl py-6"><p className="text-center text-xs font-bold uppercase tracking-[0.22em] text-palette-700 dark:text-palette-200">Một nền tảng, mọi nhịp học tập</p><div className="mt-8 grid gap-4 md:grid-cols-3">{features.map(([title, description], index) => <article className="content-card p-4 sm:p-6" key={title}><span className="text-xs font-black text-palette-700 dark:text-palette-200">0{index + 1}</span><h2 className="mt-5 text-xl font-black text-palette-950 dark:text-white">{title}</h2><p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{description}</p></article>)}</div></section>
    </div>
  )
}

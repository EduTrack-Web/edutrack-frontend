import type { PropsWithChildren, ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { Logo } from '../../../shared/components/layout/Logo'

interface AuthCardProps extends PropsWithChildren { title: string; description: string; footer?: ReactNode }

export function AuthCard({ title, description, footer, children }: AuthCardProps) {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-7xl items-center justify-center px-4 py-6 sm:px-6">
      <div className="auth-card grid w-full max-w-5xl overflow-hidden rounded-[32px] lg:grid-cols-[0.9fr_1.1fr]">
        <div className="auth-visual relative hidden min-h-150 flex-col justify-between overflow-hidden p-6 text-white lg:flex">
          <Logo inverse />
          <div className="relative z-10"><p className="text-xs font-bold uppercase tracking-[0.22em] text-palette-100">Học tập có định hướng</p><h2 className="mt-4 max-w-sm text-4xl font-black leading-tight tracking-[-0.04em]">Mỗi kế hoạch nhỏ tạo nên một hành trình lớn.</h2><p className="mt-4 max-w-sm text-sm leading-7 text-palette-100">EduTrack giúp bạn kết nối lịch trình, ghi chú và nhóm học tập trong một không gian rõ ràng.</p></div>
          <div className="relative z-10 text-xs text-palette-200">© {new Date().getFullYear()} EduTrack</div>
        </div>
        <div className="bg-white/78 p-4 backdrop-blur-2xl dark:bg-palette-950/72 sm:p-6">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-palette-700 dark:text-palette-200">EduTrack Account</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-palette-950 dark:text-white">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-7 border-t border-palette-200/70 pt-6 text-center text-sm text-slate-600 dark:border-white/10 dark:text-slate-300">{footer}</div>}
          <Link className="sr-only" to="/">Về trang chủ</Link>
        </div>
      </div>
    </section>
  )
}

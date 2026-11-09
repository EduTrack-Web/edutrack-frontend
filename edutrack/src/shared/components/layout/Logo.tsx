import { Link } from 'react-router-dom'

interface LogoProps { compact?: boolean; inverse?: boolean; to?: string; hideTextOnMobile?: boolean; onClick?: () => void }

export function Logo({ compact = false, inverse = false, to = '/', hideTextOnMobile = false, onClick }: LogoProps) {
  return (
    <Link className="flex min-w-0 items-center gap-3" to={to} aria-label="EduTrack" onClick={onClick}>
      <span className={`logo-mark grid size-11 shrink-0 place-items-center rounded-[15px] text-lg font-black ${inverse ? 'bg-white/18 text-white' : 'bg-palette-900 text-palette-100'}`}>E</span>
      {!compact && <span className={`truncate text-xl font-extrabold tracking-[-0.04em] ${hideTextOnMobile ? 'hidden sm:inline' : ''} ${inverse ? 'text-white' : 'text-palette-950 dark:text-palette-100'}`}>EduTrack</span>}
    </Link>
  )
}

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export interface GlassSelectOption<T extends string> {
  value: T
  label: string
}

interface GlassSelectProps<T extends string> {
  ariaLabel: string
  value: T
  options: readonly GlassSelectOption<T>[]
  onChange: (value: T) => void
  disabled?: boolean
  className?: string
  menuClassName?: string
}

export function GlassSelect<T extends string>({
  ariaLabel,
  value,
  options,
  onChange,
  disabled = false,
  className = '',
  menuClassName = '',
}: GlassSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ left: 12, top: 12, width: 176 })
  const selected = options.find((option) => option.value === value)

  useEffect(() => {
    if (!isOpen) return undefined
    const closeOnOutside = (event: PointerEvent) => {
      const target = event.target as Node
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) setIsOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setIsOpen(false) }
    const closeOnViewportChange = () => setIsOpen(false)
    document.addEventListener('pointerdown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    window.addEventListener('resize', closeOnViewportChange)
    window.addEventListener('scroll', closeOnViewportChange, true)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
      window.removeEventListener('resize', closeOnViewportChange)
      window.removeEventListener('scroll', closeOnViewportChange, true)
    }
  }, [isOpen])

  const toggle = () => {
    if (disabled) return
    if (isOpen) {
      setIsOpen(false)
      return
    }
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) {
      const margin = 12
      const width = Math.min(Math.max(rect.width, 176), window.innerWidth - margin * 2)
      const estimatedHeight = Math.min(options.length * 48 + 12, 280)
      const left = Math.min(Math.max(margin, rect.left), window.innerWidth - width - margin)
      const top = rect.bottom + 8 + estimatedHeight <= window.innerHeight - margin
        ? rect.bottom + 8
        : Math.max(margin, rect.top - estimatedHeight - 8)
      setPosition({ left, top, width })
    }
    setIsOpen(true)
  }

  return (
    <>
      <button aria-expanded={isOpen} aria-haspopup="listbox" aria-label={ariaLabel} className={`glass-select-trigger ${className}`} disabled={disabled} onClick={toggle} ref={triggerRef} type="button">
        <span className="truncate">{selected?.label ?? value}</span>
        <svg aria-hidden="true" className={`size-4 shrink-0 transition ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24"><path d="m7 10 5 5 5-5" /></svg>
      </button>
      {isOpen && createPortal(
        <div aria-label={ariaLabel} className={`glass-select-menu ${menuClassName}`} ref={menuRef} role="listbox" style={{ left: position.left, top: position.top, width: position.width }}>
          {options.map((option) => {
            const isSelected = option.value === value
            return (
              <button aria-selected={isSelected} className={`glass-select-option${isSelected ? ' is-selected' : ''}`} key={option.value} onClick={() => { onChange(option.value); setIsOpen(false) }} role="option" type="button">
                <span className="min-w-0 truncate whitespace-nowrap">{option.label}</span>
                {isSelected && <svg aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" /></svg>}
              </button>
            )
          })}
        </div>,
        document.body,
      )}
    </>
  )
}

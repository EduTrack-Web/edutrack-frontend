import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { NoteActionIcon } from './NoteActionIcon'

interface NoteActionsMenuProps {
  isDuplicating: boolean
  onDelete?: () => void
  onDuplicate: () => void
  onTags: () => void
}

export function NoteActionsMenu({ isDuplicating, onDelete, onDuplicate, onTags }: NoteActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const [menuPosition, setMenuPosition] = useState({ left: 12, top: 12, width: 224 })

  useEffect(() => {
    if (!isOpen) return undefined
    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target as Node
      if (!menuRef.current?.contains(target) && !popupRef.current?.contains(target)) setIsOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    const closeOnViewportChange = () => setIsOpen(false)
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    window.addEventListener('resize', closeOnViewportChange)
    window.addEventListener('scroll', closeOnViewportChange, true)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
      window.removeEventListener('resize', closeOnViewportChange)
      window.removeEventListener('scroll', closeOnViewportChange, true)
    }
  }, [isOpen])

  const runAndClose = (action: () => void) => {
    setIsOpen(false)
    action()
  }

  const toggleMenu = () => {
    if (isOpen) {
      setIsOpen(false)
      return
    }
    const rect = buttonRef.current?.getBoundingClientRect()
    if (rect) {
      const margin = 12
      const width = Math.min(224, window.innerWidth - margin * 2)
      const estimatedHeight = onDelete ? 156 : 108
      const left = Math.min(
        Math.max(margin, rect.right - width),
        window.innerWidth - width - margin,
      )
      const top = rect.bottom + 8 + estimatedHeight <= window.innerHeight - margin
        ? rect.bottom + 8
        : Math.max(margin, rect.top - estimatedHeight - 8)
      setMenuPosition({ left, top, width })
    }
    setIsOpen(true)
  }

  return (
    <div className="relative" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()} ref={menuRef}>
      <button aria-expanded={isOpen} aria-haspopup="menu" aria-label="Tùy chọn ghi chú" className="note-more-button" onClick={toggleMenu} ref={buttonRef} title="Tùy chọn ghi chú" type="button">
        <NoteActionIcon name="moreVertical" />
      </button>
      {isOpen && createPortal(
        <div className="glass-panel fixed z-50 rounded-2xl p-2 shadow-2xl" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()} ref={popupRef} role="menu" style={{ left: menuPosition.left, top: menuPosition.top, width: menuPosition.width }}>
          <button className="account-menu-item w-full" onClick={() => runAndClose(onTags)} role="menuitem" type="button">
            <NoteActionIcon name="tag" />
            <span>Gắn thẻ</span>
          </button>
          <button className="account-menu-item w-full" disabled={isDuplicating} onClick={() => runAndClose(onDuplicate)} role="menuitem" type="button">
            <NoteActionIcon name="duplicate" />
            <span>{isDuplicating ? 'Đang nhân bản…' : 'Nhân bản ghi chú'}</span>
          </button>
          {onDelete && (
            <button className="account-menu-item w-full text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/20" onClick={() => runAndClose(onDelete)} role="menuitem" type="button">
              <NoteActionIcon name="trash" />
              <span>Chuyển vào thùng rác</span>
            </button>
          )}
        </div>
      , document.body)}
    </div>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import type { NoteTag } from '@/modules/notes/models/notes.types'
import { getTagTextColor } from '@/modules/notes/models/tagColor'
import { NoteActionIcon } from '@/modules/notes/components/NoteActionIcon'

interface NoteTagFilterDropdownProps {
  tags: NoteTag[]
  selectedTagIds: string[]
  onToggle: (tagId: string) => void
  onClear: () => void
}

export function NoteTagFilterDropdown({
  tags,
  selectedTagIds,
  onToggle,
  onClear,
}: NoteTagFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [position, setPosition] = useState({ left: 12, top: 12, width: 240, listMaxHeight: 308, menuMaxHeight: 420 })
  const selectedSet = useMemo(() => new Set(selectedTagIds), [selectedTagIds])
  const filteredTags = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('vi-VN')
    const matchingTags = normalizedQuery
      ? tags.filter((tag) => tag.name.toLocaleLowerCase('vi-VN').includes(normalizedQuery))
      : tags
    return [...matchingTags].sort((left, right) =>
      left.name.localeCompare(right.name, 'vi-VN', { sensitivity: 'base' }),
    )
  }, [query, tags])

  useEffect(() => {
    if (!isOpen) return undefined
    window.setTimeout(() => searchRef.current?.focus(), 0)
    const closeOnOutside = (event: PointerEvent) => {
      const target = event.target as Node
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) setIsOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setIsOpen(false) }
    const closeOnResize = () => setIsOpen(false)
    const closeOnPageScroll = (event: Event) => {
      const target = event.target
      if (target instanceof Node && menuRef.current?.contains(target)) return
      setIsOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    window.addEventListener('resize', closeOnResize)
    window.addEventListener('scroll', closeOnPageScroll, true)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
      window.removeEventListener('resize', closeOnResize)
      window.removeEventListener('scroll', closeOnPageScroll, true)
    }
  }, [isOpen])

  const toggleDropdown = () => {
    if (isOpen) {
      setIsOpen(false)
      return
    }
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) {
      const margin = 12
      const menuGap = 8
      const width = Math.min(240, window.innerWidth - margin * 2)
      const fixedHeight = selectedTagIds.length > 0 ? 124 : 72
      const desiredListHeight = Math.max(44, Math.min(tags.length, 7) * 44)
      const desiredHeight = fixedHeight + desiredListHeight
      const availableBelow = window.innerHeight - rect.bottom - menuGap - margin
      const availableAbove = rect.top - menuGap - margin
      const openBelow = availableBelow >= Math.min(desiredHeight, 160) || availableBelow >= availableAbove
      const availableHeight = Math.max(116, openBelow ? availableBelow : availableAbove)
      const menuHeight = Math.min(desiredHeight, availableHeight)
      const listMaxHeight = Math.max(44, Math.min(308, menuHeight - fixedHeight))
      const left = Math.min(Math.max(margin, rect.right - width), window.innerWidth - width - margin)
      const top = openBelow
        ? rect.bottom + menuGap
        : Math.max(margin, rect.top - menuHeight - menuGap)
      setPosition({ left, top, width, listMaxHeight, menuMaxHeight: availableHeight })
    }
    setQuery('')
    setIsOpen(true)
  }

  return (
    <>
      <button aria-expanded={isOpen} aria-haspopup="listbox" aria-label="Lọc theo thẻ" className="glass-select-trigger w-28 shrink-0 sm:w-36" onClick={toggleDropdown} ref={triggerRef} type="button">
        <span className="truncate">Tags{selectedTagIds.length > 0 ? ` (${selectedTagIds.length})` : ''}</span>
        <svg aria-hidden="true" className={`size-4 shrink-0 transition ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24"><path d="m7 10 5 5 5-5" /></svg>
      </button>

      {isOpen && createPortal(
        <div aria-label="Chọn thẻ để lọc" aria-multiselectable="true" className="glass-select-menu p-2" ref={menuRef} role="listbox" style={{ left: position.left, maxHeight: position.menuMaxHeight, top: position.top, width: position.width }}>
          <div className="relative mx-2 my-1">
            <NoteActionIcon className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-slate-500 dark:text-slate-300" name="search" />
            <input aria-label="Tìm kiếm trong thẻ" className="min-h-11 w-full rounded-xl border border-palette-200/80 bg-white/65 py-[2px] pl-8 pr-9 text-sm text-palette-900 outline-none focus:border-palette-600 dark:border-white/15 dark:bg-white/5 dark:text-white" onChange={(event) => setQuery(event.target.value)} placeholder="Tìm Tags" ref={searchRef} value={query} />
            {query && <button aria-label="Xóa tìm kiếm thẻ" className="absolute right-0 top-1/2 grid size-10 -translate-y-1/2 place-items-center text-slate-500 dark:text-slate-300" onClick={() => setQuery('')} type="button"><NoteActionIcon className="size-4" name="close" /></button>}
          </div>

          <div className="mt-2 overflow-y-auto overscroll-contain pr-1" style={{ maxHeight: position.listMaxHeight }}>
            {filteredTags.length === 0 ? (
              <p className="px-3 py-5 text-center text-sm text-slate-500 dark:text-slate-300">Không tìm thấy thẻ phù hợp.</p>
            ) : filteredTags.map((tag) => {
              const selected = selectedSet.has(tag.id)
              return (
                <button aria-selected={selected} className={`glass-select-option !p-2 ${selected ? 'is-selected' : ''}`} key={tag.id} onClick={() => onToggle(tag.id)} role="option" type="button">
                  <span className="block max-w-[9rem] overflow-hidden text-ellipsis whitespace-nowrap rounded-full px-2 py-1 text-xs font-extrabold" style={{ backgroundColor: tag.color, color: getTagTextColor(tag.color) }} title={tag.name}>{tag.name}</span>
                  <span aria-hidden="true" className={`grid size-[18px] shrink-0 place-items-center rounded-full border text-[10px] ${selected ? 'border-palette-600 bg-palette-600 text-white dark:border-palette-200 dark:bg-palette-200 dark:text-palette-900' : 'border-palette-300 dark:border-white/25'}`}>{selected ? '✓' : ''}</span>
                </button>
              )
            })}
          </div>

          {selectedTagIds.length > 0 && <button className="mt-2 min-h-11 w-full rounded-xl px-3 text-sm font-bold text-palette-700 transition hover:bg-palette-100/70 dark:text-palette-200 dark:hover:bg-white/10" onClick={onClear} type="button">Xóa bộ lọc thẻ</button>}
        </div>,
        document.body,
      )}
    </>
  )
}

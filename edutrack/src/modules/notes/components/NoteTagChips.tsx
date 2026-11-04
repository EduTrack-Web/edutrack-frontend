import type { NoteTag } from '../models/notes.types'
import { getTagTextColor } from '../models/tagColor'

interface NoteTagChipsProps {
  tags: NoteTag[]
  onRemove?: (tagId: string) => void
  compact?: boolean
}

export function NoteTagChips({ tags, onRemove, compact = false }: NoteTagChipsProps) {
  if (tags.length === 0) return null
  return (
    <div aria-label="Thẻ của ghi chú" className={`flex flex-wrap ${compact ? 'gap-1.5' : 'gap-2'}`}>
      {tags.map((tag) => (
        <span className={`inline-flex max-w-full items-center rounded-full border-0 font-extrabold shadow-sm ${compact ? 'min-h-7 px-2.5 py-1 text-[11px]' : `min-h-11 py-1 pl-3 text-xs ${onRemove ? '' : 'pr-3'}`}`} key={tag.id} style={{ backgroundColor: tag.color, color: getTagTextColor(tag.color) }}>
          <span className="truncate">{tag.name}</span>
          {onRemove && <button aria-label={`Bỏ thẻ ${tag.name}`} className="grid size-11 shrink-0 place-items-center rounded-full text-base leading-none opacity-65 transition hover:bg-black/10 hover:opacity-100" onClick={() => onRemove(tag.id)} title="Bỏ thẻ" type="button">×</button>}
        </span>
      ))}
    </div>
  )
}

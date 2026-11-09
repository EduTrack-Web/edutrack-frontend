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
    <div aria-label="Thẻ của ghi chú" className={`flex flex-wrap ${compact ? 'gap-1.5' : 'gap-x-2 gap-y-3'}`}>
      {tags.map((tag) => (
        <span className={`inline-flex max-w-full items-center rounded-full border-0 font-extrabold shadow-sm ${compact ? 'min-h-7 px-2.5 py-1 text-[11px]' : `min-h-8 pl-3 text-xs ${onRemove ? '' : 'pr-3'}`}`} key={tag.id} style={{ backgroundColor: tag.color, color: getTagTextColor(tag.color) }}>
          <span className="truncate">{tag.name}</span>
          {onRemove && (
            <button aria-label={`Bỏ thẻ ${tag.name}`} className="group -my-1.5 grid size-11 shrink-0 place-items-center text-base leading-none opacity-65 transition hover:opacity-100" onClick={() => onRemove(tag.id)} title="Bỏ thẻ" type="button">
              <span aria-hidden="true" className="grid size-8 place-items-center rounded-full transition group-hover:bg-black/10">×</span>
            </button>
          )}
        </span>
      ))}
    </div>
  )
}

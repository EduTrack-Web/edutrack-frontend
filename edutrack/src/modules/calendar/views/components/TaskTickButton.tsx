import { Icon } from '../../../../shared/components/Icon'

interface TaskTickButtonProps {
  isCompleted: boolean
  onToggle: () => void
  size?: 'sm' | 'md'
}

export function TaskTickButton({ isCompleted, onToggle, size = 'md' }: TaskTickButtonProps) {
  const dimension = size === 'sm' ? 'size-4' : 'size-5'
  const iconSize = size === 'sm' ? 'size-2.5' : 'size-3'

  return (
    <button
      aria-label={isCompleted ? 'Mở lại nhiệm vụ' : 'Đánh dấu hoàn thành'}
      aria-pressed={isCompleted}
      className={`relative grid ${dimension} shrink-0 place-items-center rounded-full border-2 transition-all before:absolute before:-inset-2 before:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
        isCompleted
          ? 'border-white bg-white text-emerald-600'
          : 'border-white/90 bg-transparent text-transparent hover:bg-white/30 hover:text-white'
      }`}
      onClick={(event) => {
        event.stopPropagation()
        onToggle()
      }}
      title={isCompleted ? 'Đã hoàn thành • Nhấn để mở lại' : 'Đánh dấu đã hoàn thành'}
      type="button"
    >
      <Icon className={iconSize} name="check" />
    </button>
  )
}

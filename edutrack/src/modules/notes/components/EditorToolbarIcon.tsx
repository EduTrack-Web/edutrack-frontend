import type { ReactNode } from 'react'

export type EditorToolbarIconName = 'bold' | 'italic' | 'underline' | 'bulletList' | 'orderedList' | 'taskList' | 'image' | 'textColor' | 'chevronDown' | 'save'

const paths: Record<EditorToolbarIconName, ReactNode> = {
  bold: <><path d="M8 5h5a3.5 3.5 0 0 1 0 7H8V5Z" /><path d="M8 12h6a3.5 3.5 0 0 1 0 7H8v-7Z" /></>,
  italic: <><path d="M10 5h7M7 19h7M14 5 10 19" /></>,
  underline: <><path d="M7 5v6a5 5 0 0 0 10 0V5M5 21h14" /></>,
  bulletList: <><circle cx="5" cy="7" r="1" fill="currentColor" stroke="none" /><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="5" cy="17" r="1" fill="currentColor" stroke="none" /><path d="M9 7h10M9 12h10M9 17h10" /></>,
  orderedList: <><path d="M4 6h1v3M4 9h2M4 13h2l-2 3h2M10 7h9M10 12h9M10 17h9" /></>,
  taskList: <><rect x="3.5" y="4.5" width="5" height="5" rx="1" /><rect x="3.5" y="14.5" width="5" height="5" rx="1" /><path d="M12 7h8M12 17h8" /></>,
  image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m4 17 5-5 3 3 2-2 6 6" /></>,
  textColor: <><path d="m6 17 5-12h2l5 12M8 13h8M5 21h14" /></>,
  chevronDown: <path d="m7 9 5 5 5-5" />,
  save: <><path d="M5 3h12l2 2v16H5V3Z" /><path d="M8 3v6h8V3M8 21v-7h8v7" /></>,
}

export function EditorToolbarIcon({ name, className = 'size-5' }: { name: EditorToolbarIconName; className?: string }) {
  return <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">{paths[name]}</svg>
}

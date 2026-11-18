import type { ReactNode } from 'react'

import type { NoteContentMark, NoteContentNode } from '@/modules/notes/models/notes.types'

const renderMarks = (text: string, marks: NoteContentMark[] = []): ReactNode =>
  marks.reduce<ReactNode>((content, mark, index) => {
    if (mark.type === 'bold') return <strong key={index}>{content}</strong>
    if (mark.type === 'italic') return <em key={index}>{content}</em>
    if (mark.type === 'underline') return <u key={index}>{content}</u>
    if (mark.type === 'textStyle' && typeof mark.attrs?.color === 'string') {
      return <span key={index} style={{ color: mark.attrs.color }}>{content}</span>
    }
    return content
  }, text)

const renderNodes = (nodes: NoteContentNode[] = []): ReactNode[] =>
  nodes.map((node, index) => {
    const children = renderNodes(node.content)
    switch (node.type) {
      case 'text':
        return <span key={index}>{renderMarks(node.text ?? '', node.marks)}</span>
      case 'hardBreak':
        return <br key={index} />
      case 'paragraph':
        return <p key={index}>{children.length ? children : <br />}</p>
      case 'heading': {
        const level = Number(node.attrs?.level)
        if (level === 1) return <h1 key={index}>{children}</h1>
        if (level === 2) return <h2 key={index}>{children}</h2>
        return <h3 key={index}>{children}</h3>
      }
      case 'bulletList':
        return <ul className="note-preview-bullet" key={index}>{children}</ul>
      case 'orderedList':
        return <ol key={index} start={typeof node.attrs?.start === 'number' ? node.attrs.start : 1}>{children}</ol>
      case 'listItem':
        return <li key={index}>{children}</li>
      case 'taskList':
        return <ul className="note-preview-tasks" key={index}>{children}</ul>
      case 'taskItem':
        return <li key={index}><span aria-hidden="true" className="note-preview-checkbox">{node.attrs?.checked === true ? '✓' : ''}</span><div>{children}</div></li>
      case 'image':
        return typeof node.attrs?.src === 'string' ? <img alt={typeof node.attrs.alt === 'string' ? node.attrs.alt : ''} key={index} src={node.attrs.src} /> : null
      default:
        return null
    }
  })

export function NotePreview({ content }: { content: NoteContentNode }) {
  return <div className="note-preview">{renderNodes(content.content)}</div>
}

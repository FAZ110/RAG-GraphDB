import { useEffect, useEffectEvent } from 'react'

export type EditorKey =
  | 'search'
  | 'expand'
  | 'common'
  | 'path'
  | 'type'
  | 'fit'
  | 'tidy'
  | 'accept'
  | 'escape'
  | 'remove'
  | 'undo'
  | 'redo'
  | 'selectAll'

const isTyping = (target: EventTarget | null) => {
  const el = target as HTMLElement | null
  return el?.isContentEditable || el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA'
}

const LETTERS: Record<string, EditorKey> = {
  '/': 'search',
  e: 'expand',
  c: 'common',
  p: 'path',
  t: 'type',
  f: 'fit',
  l: 'tidy',
}

function keyOf(e: KeyboardEvent): EditorKey | null {
  const mod = e.metaKey || e.ctrlKey
  const key = e.key.toLowerCase()
  if (mod && key === 'z') return e.shiftKey ? 'redo' : 'undo'
  if (mod && key === 'y') return 'redo'
  if (mod && key === 'a') return 'selectAll'
  if (mod || e.altKey) return null
  if (key === 'enter') return 'accept'
  if (key === 'escape') return 'escape'
  if (key === 'delete' || key === 'backspace') return 'remove'
  return LETTERS[key] ?? null
}

/** The editor's shortcuts, ignored while typing into a field. */
export function useEditorKeys(onKey: (key: EditorKey) => boolean | void) {
  const handle = useEffectEvent(onKey)
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return
      const key = keyOf(e)
      // A handler returning false leaves the key to the browser, e.g. Enter on a focused button.
      if (key && handle(key) !== false) e.preventDefault()
    }
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [])
}

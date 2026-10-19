import { useEffect } from 'react'
import type { RefObject } from 'react'

const isTyping = (target: EventTarget | null) => {
  const el = target as HTMLElement | null
  return el?.isContentEditable || el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA'
}

export function useFocusShortcut(ref: RefObject<HTMLElement | null>, key: string) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === key && !isTyping(e.target)) {
        e.preventDefault()
        ref.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [ref, key])
}

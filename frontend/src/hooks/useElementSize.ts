import { useCallback, useState } from 'react'
import { flushSync } from 'react-dom'

interface Size {
  width: number
  height: number
}

export function useElementSize<T extends Element>(): [(el: T | null) => void, Size | null] {
  const [size, setSize] = useState<Size | null>(null)

  const ref = useCallback((el: T | null) => {
    if (!el) return
    const update = (width: number, height: number) =>
      setSize((prev) =>
        prev?.width === width && prev.height === height ? prev : { width, height }
      )
    // Measured now and rendered synchronously on every resize, so sized content never shows a
    // frame at the old size.
    const { width, height } = el.getBoundingClientRect()
    update(width, height)
    const observer = new ResizeObserver(([entry]) => {
      // Older Safari has no border box sizes; the content rect is the next best thing there.
      const box = entry.borderBoxSize?.[0]
      flushSync(() => {
        if (box) update(box.inlineSize, box.blockSize)
        else update(entry.contentRect.width, entry.contentRect.height)
      })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return [ref, size]
}

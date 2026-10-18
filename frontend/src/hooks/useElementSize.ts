import { useCallback, useState } from 'react'

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
    // Measured before paint: the observer reports a frame late, and sized content visibly grew.
    const { width, height } = el.getBoundingClientRect()
    update(width, height)
    const observer = new ResizeObserver(([entry]) => {
      const [{ inlineSize, blockSize }] = entry.borderBoxSize
      update(inlineSize, blockSize)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return [ref, size]
}

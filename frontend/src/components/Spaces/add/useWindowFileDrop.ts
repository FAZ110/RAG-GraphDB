import { useEffect, useRef, useState } from 'react'

const hasFiles = (e: DragEvent) => e.dataTransfer?.types.includes('Files') ?? false

/** Files dropped anywhere in the window; `dragging` while some are held over it. */
export function useWindowFileDrop(onDrop: (files: FileList) => void) {
  const [dragging, setDragging] = useState(false)
  const depth = useRef(0)
  // The listeners are set up once, so they call the latest handler through a ref.
  const handler = useRef(onDrop)
  useEffect(() => {
    handler.current = onDrop
  })

  useEffect(() => {
    // Counted, since entering a child fires dragenter on it before dragleave on the parent.
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return
      depth.current += 1
      setDragging(true)
    }
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return
      depth.current = Math.max(0, depth.current - 1)
      if (depth.current === 0) setDragging(false)
    }
    // Without this the browser would open the dropped file in place of the app.
    const over = (e: DragEvent) => hasFiles(e) && e.preventDefault()
    // Reset while capturing: a drop zone that handles the files stops them reaching `drop`.
    const reset = () => {
      depth.current = 0
      setDragging(false)
    }
    const drop = (e: DragEvent) => {
      if (!hasFiles(e) || !e.dataTransfer) return
      e.preventDefault()
      handler.current(e.dataTransfer.files)
    }
    window.addEventListener('dragenter', enter)
    window.addEventListener('dragleave', leave)
    window.addEventListener('dragover', over)
    window.addEventListener('drop', reset, true)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragenter', enter)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('dragover', over)
      window.removeEventListener('drop', reset, true)
      window.removeEventListener('drop', drop)
    }
  }, [])

  return dragging
}

import { useEffect, useEffectEvent, useRef } from 'react'

interface Props {
  loading: boolean
  onLoad: () => void
}

/** The end of a list: scrolled into view, it asks for the next page. */
export function LoadMore({ loading, onLoad }: Props) {
  const end = useRef<HTMLDivElement>(null)
  const load = useEffectEvent(() => {
    if (!loading) onLoad()
  })
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && load())
    if (end.current) observer.observe(end.current)
    return () => observer.disconnect()
  }, [])
  return (
    <div ref={end} className="px-5 py-3 text-xs text-fg-subtle" aria-live="polite">
      {loading ? 'Wczytuję kolejne…' : ' '}
    </div>
  )
}

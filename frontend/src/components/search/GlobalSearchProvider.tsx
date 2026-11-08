import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { GlobalSearch } from './GlobalSearch'
import { GlobalSearchContext } from './globalSearchContext'

export function GlobalSearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((was) => !was)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <GlobalSearchContext.Provider value={() => setOpen(true)}>
      {children}
      <GlobalSearch open={open} onOpenChange={setOpen} />
    </GlobalSearchContext.Provider>
  )
}

import { createContext, useContext } from 'react'
import type { MouseEvent } from 'react'

export interface AddRequest {
  /** The space on screen when left out. */
  spaceId?: string
  /** Screen point the dialog grows from. */
  origin?: { x: number; y: number }
}

export const AddArticlesContext = createContext<(request?: AddRequest) => void>(() => {})

export const useOpenAddArticles = () => useContext(AddArticlesContext)

/** A click handler opening the dialog for the space, grown from the clicked control. */
export function useAddArticlesClick(spaceId: string) {
  const open = useOpenAddArticles()
  return (e: MouseEvent<Element>) => {
    const r = e.currentTarget.getBoundingClientRect()
    open({ spaceId, origin: { x: r.left + r.width / 2, y: r.top + r.height / 2 } })
  }
}

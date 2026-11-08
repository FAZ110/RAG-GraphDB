import { createContext, useContext } from 'react'

export interface AddRequest {
  /** The space on screen when left out. */
  spaceId?: string
}

export const AddArticlesContext = createContext<(request?: AddRequest) => void>(() => {})

export const useOpenAddArticles = () => useContext(AddArticlesContext)

export function useAddArticlesClick(spaceId: string) {
  const open = useOpenAddArticles()
  return () => open({ spaceId })
}

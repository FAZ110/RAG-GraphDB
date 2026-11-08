import { createContext, useContext } from 'react'

export const GlobalSearchContext = createContext<() => void>(() => {})

export const useOpenGlobalSearch = () => useContext(GlobalSearchContext)

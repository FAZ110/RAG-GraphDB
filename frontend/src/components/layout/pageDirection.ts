import { createContext, useContext } from 'react'

// Sections in the order the navigation rail lists them, top to bottom.
const ORDER = ['', 'spaces', 'analyses', 'graph', 'settings']

/** 1 going down the rail, -1 going up, 0 when it can't tell. */
export function directionBetween(from: string, to: string): number {
  const a = ORDER.indexOf(from)
  const b = ORDER.indexOf(to)
  return a < 0 || b < 0 ? 0 : Math.sign(b - a)
}

export const PageDirection = createContext(0)

export const usePageDirection = () => useContext(PageDirection)

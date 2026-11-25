import { createContext, useContext } from 'react'
import type { Pattern } from './pattern'

/** Letters telling sought nodes apart, A, B, C… in drawing order; none when only one is sought. */
export function soughtLetters(pattern: Pattern): ReadonlyMap<string, string> {
  const sought = pattern.nodes.filter((n) => !n.known)
  if (sought.length < 2) return new Map()
  return new Map(sought.map((n, i) => [n.key, String.fromCharCode(65 + i)]))
}

export const LettersContext = createContext<ReadonlyMap<string, string>>(new Map())

export const useLetters = () => useContext(LettersContext)

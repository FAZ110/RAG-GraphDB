import { inkFor } from '@/design/inks'

const resolved = new Map<string, string>()

/** A token's value, as a canvas renderer can't read CSS variables. */
export function tokenValue(token: string): string {
  const name = token.match(/var\((--[\w-]+)\)/)?.[1] ?? token
  let value = resolved.get(name)
  if (value === undefined) {
    value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    resolved.set(name, value)
  }
  return value
}

export function inkColors(label: string): { color: string; field: string } {
  const ink = inkFor(label)
  return { color: tokenValue(ink.color), field: tokenValue(ink.field) }
}

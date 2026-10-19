import { hashString } from '@/lib/hash'

// CSS variables, so a dark theme can redefine them in tokens.css.
export interface Ink {
  color: string
  field: string
}

const INK_NAMES = [
  'cherry',
  'brick',
  'rust',
  'ochre',
  'olive',
  'lichen',
  'moss',
  'fir',
  'malachite',
  'teal',
  'fjord',
  'steel',
  'cobalt',
  'indigo',
  'heather',
  'violet',
  'raspberry',
  'plum',
] as const

export const INKS: Ink[] = INK_NAMES.map((name) => ({
  color: `var(--ink-${name})`,
  field: `var(--ink-${name}-field)`,
}))

export const PENCIL: Ink = { color: 'var(--fg-subtle)', field: 'var(--surface-sunken)' }

export function inkFor(key: string): Ink {
  return INKS[hashString(key) % INKS.length]
}

export function inkTint(ink: Ink, percent: number): string {
  return `color-mix(in oklch, ${ink.color} ${percent}%, transparent)`
}

import type { Space } from '@/types'

// Case- and accent-insensitive form of a name. Keeps the string length for Polish
// letters, so match positions found here map back onto the original name.
export function normalize(text: string): string {
  return text
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'L')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

export function filterSpaces(spaces: Space[], needle: string): Space[] {
  return needle ? spaces.filter((space) => normalize(space.name).includes(needle)) : spaces
}

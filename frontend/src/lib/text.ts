// Keeps the string length, so match positions map back onto the original text.
export function normalize(text: string): string {
  return text
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'L')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

// Labels and relationship types become Neo4j labels: the backend accepts uppercase identifiers.
export function toIdentifier(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
}

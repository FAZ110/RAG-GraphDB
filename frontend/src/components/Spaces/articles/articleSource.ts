export function sourceHost(url: string | null): string {
  if (!url) return 'wklejony tekst'
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

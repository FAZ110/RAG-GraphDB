const time = new Intl.DateTimeFormat('pl-PL', { hour: '2-digit', minute: '2-digit' })
const ago = new Intl.RelativeTimeFormat('pl-PL', { numeric: 'auto' })

/** "przed chwilą", "3 minuty temu, 14:32" or, from another day, the date and time. */
export function savedAtText(iso: string, now = Date.now()): string {
  const at = new Date(iso)
  const minutes = Math.round((now - at.getTime()) / 60_000)
  if (minutes < 1) return 'przed chwilą'
  if (minutes < 60) return `${ago.format(-minutes, 'minute')}, ${time.format(at)}`
  if (new Date(now).toDateString() === at.toDateString()) return `dziś, ${time.format(at)}`
  return at.toLocaleString('pl-PL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

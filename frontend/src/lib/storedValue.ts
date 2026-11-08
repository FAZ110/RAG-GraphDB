import { useSyncExternalStore } from 'react'

interface Codec<T> {
  parse: (raw: string) => T
  format: (value: T) => string
}

// Storage can be unavailable (private mode, blocked site data); what is kept here is only a
// convenience, so a failed read falls back to the default and a failed write is ignored.
export function storedValue<T>(key: string, fallback: T, { parse, format }: Codec<T>) {
  const listeners = new Set<() => void>()
  let value = fallback
  try {
    const raw = localStorage.getItem(key)
    if (raw !== null) value = parse(raw)
  } catch {
    /* empty */
  }

  const get = () => value
  const subscribe = (listener: () => void) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  return {
    get,
    set(next: T) {
      value = next
      try {
        localStorage.setItem(key, format(next))
      } catch {
        /* empty */
      }
      listeners.forEach((listener) => listener())
    },
    useValue: () => useSyncExternalStore(subscribe, get),
  }
}

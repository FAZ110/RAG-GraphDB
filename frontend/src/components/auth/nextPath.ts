const FALLBACK = '/'

/**
 * Where to go after signing in. Only a path inside the app counts: `//host` and `/\host` would
 * leave it, so a crafted link cannot send someone elsewhere once they sign in.
 */
export function safeNext(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
    return FALLBACK
  }
  return next
}

/** The sign-in address that brings the visitor back to `path` afterwards. */
export function signInPath(path: string): string {
  return path === FALLBACK ? '/login' : `/login?next=${encodeURIComponent(path)}`
}
